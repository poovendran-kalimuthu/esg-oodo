import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Helper to recalculate department rankings and scores
async function recalculateMetrics(departmentId?: string) {
  if (departmentId) {
    // 1. Calculate total emissions for this department from its transactions
    const txAggregation = await prisma.carbonTransaction.aggregate({
      where: { departmentId },
      _sum: { calculatedCo2: true }
    });

    const calculatedTons = (txAggregation._sum.calculatedCo2 || 0) / 1000;

    // Get the base seeded emissions so we don't wipe it out
    const deptMetric = await prisma.departmentEnvironmentMetric.findUnique({
      where: { departmentId }
    });

    const baseEmissions = deptMetric ? deptMetric.totalEmissions : 0;
    // We add the new transaction total to any base emissions (if base is greater than calculated)
    const newTotal = Math.max(baseEmissions, calculatedTons);

    // 2. Adjust carbon score based on emissions (higher emissions slightly lower the score)
    // Starting at a baseline (e.g., 90) and reducing by a factor of emissions
    const baseline = 95;
    const newScore = Math.max(10, Math.min(100, baseline - Math.round(newTotal / 30)));

    await prisma.departmentEnvironmentMetric.upsert({
      where: { departmentId },
      update: {
        totalEmissions: newTotal,
        carbonScore: newScore,
      },
      create: {
        departmentId,
        totalEmissions: newTotal,
        carbonScore: newScore,
        rank: 5
      }
    });
  }

  // 3. Re-calculate overall rankings for all departments (sorted by totalEmissions descending)
  const allMetrics = await prisma.departmentEnvironmentMetric.findMany({
    orderBy: { totalEmissions: 'desc' }
  });

  for (let i = 0; i < allMetrics.length; i++) {
    await prisma.departmentEnvironmentMetric.update({
      where: { id: allMetrics[i].id },
      data: { rank: i + 1 }
    });
  }
}

// -------------------------------------------------------------
// EMISSION FACTORS
// -------------------------------------------------------------

router.get('/factors', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const factors = await prisma.emissionFactor.findMany({
      orderBy: { source: 'asc' }
    });
    res.json({ success: true, factors });
  } catch (err) {
    next(err);
  }
});

router.post('/factors', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { source, category, unit, factor, status } = req.body;

  // Validation
  if (!source || typeof source !== 'string' || !source.trim()) {
    return res.status(400).json({ success: false, message: 'Source is required' });
  }
  if (!unit || typeof unit !== 'string' || !unit.trim()) {
    return res.status(400).json({ success: false, message: 'Unit is required' });
  }
  const numericFactor = Number(factor);
  if (isNaN(numericFactor) || numericFactor <= 0) {
    return res.status(400).json({ success: false, message: 'Factor must be a number greater than 0' });
  }

  try {
    const existing = await prisma.emissionFactor.findUnique({ where: { source } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Emission factor source must be unique' });
    }

    const newFactor = await prisma.emissionFactor.create({
      data: {
        source: source.trim(),
        category: category || 'General',
        unit: unit.trim(),
        factor: numericFactor,
        status: status || 'Active'
      }
    });

    res.status(201).json({ success: true, factor: newFactor });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// PRODUCT ESG PROFILES
// -------------------------------------------------------------

router.get('/products', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.productProfile.findMany({
      orderBy: { productName: 'asc' }
    });
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

router.post('/products', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { productName, category, carbonFootprint, recyclable, esgRating } = req.body;

  // Validation
  if (!productName || typeof productName !== 'string' || !productName.trim()) {
    return res.status(400).json({ success: false, message: 'Product name is required' });
  }
  const footprint = Number(carbonFootprint);
  if (isNaN(footprint) || footprint < 0) {
    return res.status(400).json({ success: false, message: 'Carbon footprint must be a number >= 0' });
  }
  const ratings = ['A', 'B', 'C', 'D'];
  if (!esgRating || !ratings.includes(esgRating)) {
    return res.status(400).json({ success: false, message: 'ESG Rating must be one of A, B, C, or D' });
  }

  try {
    const newProduct = await prisma.productProfile.create({
      data: {
        productName: productName.trim(),
        category: category || 'General',
        carbonFootprint: footprint,
        recyclable: recyclable === true || recyclable === 'true',
        esgRating
      }
    });

    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// CARBON TRANSACTIONS
// -------------------------------------------------------------

router.get('/transactions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.carbonTransaction.findMany({
      include: {
        department: { select: { name: true } },
        emissionFactor: true
      },
      orderBy: { date: 'desc' }
    });

    const formatted = transactions.map(t => ({
      id: t.id,
      department: t.department.name,
      emissionSource: t.emissionFactor.source,
      quantity: t.quantity,
      unit: t.emissionFactor.unit,
      emissionFactor: t.emissionFactor.factor,
      calculatedCo2: t.calculatedCo2,
      date: t.date.toISOString().split('T')[0]
    }));

    res.json({ success: true, transactions: formatted });
  } catch (err) {
    next(err);
  }
});

router.post('/transactions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { departmentName, emissionSource, quantity, date } = req.body;

  // Validation
  if (!departmentName) {
    return res.status(400).json({ success: false, message: 'Department is required' });
  }
  if (!emissionSource) {
    return res.status(400).json({ success: false, message: 'Emission source is required' });
  }
  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
  }
  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required' });
  }

  try {
    const dept = await prisma.department.findUnique({
      where: { name: departmentName }
    });
    if (!dept) {
      return res.status(400).json({ success: false, message: `Department '${departmentName}' not found` });
    }

    const factorRecord = await prisma.emissionFactor.findUnique({
      where: { source: emissionSource }
    });
    if (!factorRecord) {
      return res.status(400).json({ success: false, message: `Emission factor source '${emissionSource}' not found` });
    }

    const calculatedCo2 = qty * factorRecord.factor;

    const newTx = await prisma.carbonTransaction.create({
      data: {
        departmentId: dept.id,
        emissionFactorId: factorRecord.id,
        quantity: qty,
        calculatedCo2,
        date: new Date(date)
      }
    });

    // Automatically recalculate metrics and rankings
    await recalculateMetrics(dept.id);

    res.status(201).json({ success: true, transaction: newTx });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// SUSTAINABILITY GOALS
// -------------------------------------------------------------

router.get('/goals', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.sustainabilityGoal.findMany({
      include: {
        department: { select: { name: true } }
      },
      orderBy: { deadline: 'asc' }
    });

    const formatted = goals.map(g => ({
      id: g.id,
      name: g.name,
      department: g.department.name,
      targetCO2: g.targetCo2,
      currentCO2: g.currentCo2,
      deadline: g.deadline.toISOString().split('T')[0],
      manager: g.manager,
      status: g.status
    }));

    res.json({ success: true, goals: formatted });
  } catch (err) {
    next(err);
  }
});

router.post('/goals', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { name, departmentName, targetCO2, currentCO2, deadline, manager } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Goal name is required' });
  }
  if (!departmentName) {
    return res.status(400).json({ success: false, message: 'Department is required' });
  }
  const target = Number(targetCO2);
  if (isNaN(target) || target <= 0) {
    return res.status(400).json({ success: false, message: 'Target CO2 must be greater than 0' });
  }
  const current = Number(currentCO2 || 0);
  if (isNaN(current) || current < 0) {
    return res.status(400).json({ success: false, message: 'Current CO2 must be >= 0' });
  }
  if (!deadline) {
    return res.status(400).json({ success: false, message: 'Deadline date is required' });
  }
  const deadlineDate = new Date(deadline);
  if (deadlineDate <= new Date()) {
    return res.status(400).json({ success: false, message: 'Deadline must be in the future' });
  }
  if (!manager || typeof manager !== 'string' || !manager.trim()) {
    return res.status(400).json({ success: false, message: 'Manager name is required' });
  }

  try {
    const dept = await prisma.department.findUnique({
      where: { name: departmentName }
    });
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    const progress = target > 0 ? ((target - current) / target) * 100 : 0;
    let status = 'Active';
    if (progress >= 100) status = 'Completed';
    else if (progress >= 80) status = 'On Track';

    const newGoal = await prisma.sustainabilityGoal.create({
      data: {
        name: name.trim(),
        departmentId: dept.id,
        targetCo2: target,
        currentCo2: current,
        deadline: deadlineDate,
        manager: manager.trim(),
        status
      }
    });

    res.status(201).json({ success: true, goal: newGoal });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// DEPARTMENTS ENVIRONMENT TRACKING
// -------------------------------------------------------------

router.get('/departments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await prisma.departmentEnvironmentMetric.findMany({
      include: {
        department: { select: { name: true } }
      },
      orderBy: { rank: 'asc' }
    });

    const formatted = metrics.map(m => ({
      department: m.department.name,
      totalEmissions: m.totalEmissions,
      carbonScore: m.carbonScore,
      monthlyChange: m.monthlyChange,
      rank: m.rank
    }));

    res.json({ success: true, departments: formatted });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// ENVIRONMENTAL DASHBOARD AGGREGATE
// -------------------------------------------------------------

router.get('/dashboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await prisma.departmentEnvironmentMetric.findMany({
      include: { department: { select: { name: true } } }
    });

    const totalEmissions = metrics.reduce((sum, m) => sum + m.totalEmissions, 0);
    const avgScore = metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.carbonScore, 0) / metrics.length)
      : 100;

    const goals = await prisma.sustainabilityGoal.findMany();
    const activeGoalsCount = goals.filter(g => g.status === 'Active' || g.status === 'On Track').length;
    
    // Carbon Reduction progress: average of all goals progress
    let totalProgressSum = 0;
    goals.forEach(g => {
      const p = g.targetCo2 > 0 ? ((g.targetCo2 - g.currentCo2) / g.targetCo2) * 100 : 0;
      totalProgressSum += Math.min(100, Math.max(0, p));
    });
    const avgProgress = goals.length > 0 ? Math.round(totalProgressSum / goals.length) : 0;

    // Monthly carbon trend: merge seeded monthly base data with any actual database transactions
    const baseMonthlyEmissions = [
      { month: 'Jan', emissions: 3820 },
      { month: 'Feb', emissions: 3650 },
      { month: 'Mar', emissions: 3910 },
      { month: 'Apr', emissions: 3540 },
      { month: 'May', emissions: 3280 },
      { month: 'Jun', emissions: 3110 },
    ];

    const transactions = await prisma.carbonTransaction.findMany({
      include: { emissionFactor: true }
    });

    // Add calculations of current database transactions to the monthly curve
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    transactions.forEach(t => {
      const monthIdx = t.date.getMonth();
      const monthLabel = monthNames[monthIdx];
      const existing = baseMonthlyEmissions.find(b => b.month === monthLabel);
      if (existing) {
        existing.emissions += Math.round(t.calculatedCo2);
      } else {
        // If not in standard base 6 months, append it
        if (monthIdx <= new Date().getMonth()) {
          baseMonthlyEmissions.push({ month: monthLabel, emissions: Math.round(t.calculatedCo2) });
        }
      }
    });

    // Group emissions sources by Category
    const categoryTotals: Record<string, number> = {
      'Energy': 45,
      'Transport': 25,
      'Waste': 15,
      'Logistics': 15
    };

    transactions.forEach(t => {
      const cat = t.emissionFactor.category || 'General';
      if (categoryTotals[cat] !== undefined) {
        categoryTotals[cat] += Math.round(t.calculatedCo2 / 100); // scaled proportional
      } else {
        categoryTotals[cat] = Math.round(t.calculatedCo2 / 100);
      }
    });

    const emissionSources = Object.keys(categoryTotals).map(name => ({
      name,
      value: categoryTotals[name]
    }));

    const deptStats = metrics.map(m => ({
      department: m.department.name,
      totalEmissions: m.totalEmissions,
      carbonScore: m.carbonScore,
      monthlyChange: m.monthlyChange,
      rank: m.rank
    }));

    res.json({
      success: true,
      summary: {
        environmentalScore: avgScore,
        totalCarbonEmissions: totalEmissions,
        activeGoals: activeGoalsCount,
        reductionProgress: avgProgress
      },
      monthlyEmissions: baseMonthlyEmissions,
      emissionSources,
      deptStats
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// CSV & PDF REPORTS EXPORT GENERATOR
// -------------------------------------------------------------

router.post('/reports/export', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { reportType, format } = req.body;

  try {
    let filename = 'environmental-report';
    let dataString = '';

    if (reportType === 'Environmental Report' || reportType === 'Carbon Summary') {
      const transactions = await prisma.carbonTransaction.findMany({
        include: { department: true, emissionFactor: true }
      });
      filename = `${reportType.toLowerCase().replace(/ /g, '-')}`;

      if (format === 'csv') {
        dataString = 'Transaction ID,Department,Source,Quantity,Unit,Factor,Calculated CO2 (kg),Date\n';
        transactions.forEach(t => {
          dataString += `"${t.id}","${t.department.name}","${t.emissionFactor.source}",${t.quantity},"${t.emissionFactor.unit}",${t.emissionFactor.factor},${t.calculatedCo2},"${t.date.toISOString().split('T')[0]}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(dataString);
      } else {
        // Simple printable PDF layout summary
        dataString = `========================================================\n`;
        dataString += `                ${reportType.toUpperCase()} REPORT\n`;
        dataString += `========================================================\n\n`;
        transactions.forEach(t => {
          dataString += `Department: ${t.department.name}\n`;
          dataString += `Source:     ${t.emissionFactor.source}\n`;
          dataString += `Quantity:   ${t.quantity} ${t.emissionFactor.unit}\n`;
          dataString += `Emissions:  ${t.calculatedCo2.toFixed(2)} kg CO2e\n`;
          dataString += `Date:       ${t.date.toISOString().split('T')[0]}\n`;
          dataString += `--------------------------------------------------------\n`;
        });
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.txt`);
        return res.send(dataString);
      }
    } else if (reportType === 'Department Report') {
      const metrics = await prisma.departmentEnvironmentMetric.findMany({
        include: { department: true },
        orderBy: { rank: 'asc' }
      });
      filename = 'department-emissions-ranking';

      if (format === 'csv') {
        dataString = 'Rank,Department,Total Emissions (tons),Carbon Score,Monthly Change (%)\n';
        metrics.forEach(m => {
          dataString += `${m.rank},"${m.department.name}",${m.totalEmissions},${m.carbonScore},${m.monthlyChange}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(dataString);
      } else {
        dataString = `========================================================\n`;
        dataString += `              DEPARTMENT COMPLIANCE REPORT\n`;
        dataString += `========================================================\n\n`;
        metrics.forEach(m => {
          dataString += `Rank ${m.rank}: ${m.department.name}\n`;
          dataString += `Total Emissions: ${m.totalEmissions} tons\n`;
          dataString += `Carbon Score:    ${m.carbonScore}/100\n`;
          dataString += `Monthly Change:  ${m.monthlyChange}%\n`;
          dataString += `--------------------------------------------------------\n`;
        });
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.txt`);
        return res.send(dataString);
      }
    } else {
      // Sustainability Goal Report
      const goals = await prisma.sustainabilityGoal.findMany({
        include: { department: true }
      });
      filename = 'sustainability-goals-progress';

      if (format === 'csv') {
        dataString = 'Goal Name,Department,Target CO2 (tons),Current CO2 (tons),Manager,Deadline,Status\n';
        goals.forEach(g => {
          dataString += `"${g.name}","${g.department.name}",${g.targetCo2},${g.currentCo2},"${g.manager}","${g.deadline.toISOString().split('T')[0]}","${g.status}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(dataString);
      } else {
        dataString = `========================================================\n`;
        dataString += `              SUSTAINABILITY GOALS SUMMARY\n`;
        dataString += `========================================================\n\n`;
        goals.forEach(g => {
          dataString += `Goal:       ${g.name}\n`;
          dataString += `Department: ${g.department.name}\n`;
          dataString += `Target:     ${g.targetCo2} tons\n`;
          dataString += `Current:    ${g.currentCo2} tons\n`;
          dataString += `Manager:    ${g.manager}\n`;
          dataString += `Deadline:   ${g.deadline.toISOString().split('T')[0]}\n`;
          dataString += `Status:     ${g.status}\n`;
          dataString += `--------------------------------------------------------\n`;
        });
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.txt`);
        return res.send(dataString);
      }
    }
  } catch (err) {
    next(err);
  }
});

export default router;
