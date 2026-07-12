const { z } = require('zod');

const createCSRSchema = z.object({
  title:               z.string().min(3).max(200),
  description:         z.string().min(10),
  categoryId:          z.string().cuid(),
  departmentId:        z.string().cuid().optional().nullable(),
  sdgGoal:             z.enum([
    'NO_POVERTY','ZERO_HUNGER','GOOD_HEALTH','QUALITY_EDUCATION',
    'GENDER_EQUALITY','CLEAN_WATER','CLEAN_ENERGY','DECENT_WORK',
    'INDUSTRY_INNOVATION','REDUCED_INEQUALITIES','SUSTAINABLE_CITIES',
    'RESPONSIBLE_CONSUMPTION','CLIMATE_ACTION','LIFE_BELOW_WATER',
    'LIFE_ON_LAND','PEACE_JUSTICE','PARTNERSHIPS',
  ]),
  organizerId:         z.string().cuid(),
  eventDate:           z.string().datetime(),
  registrationDeadline:z.string().datetime(),
  venue:               z.string().min(3),
  maxParticipants:     z.number().int().min(1).max(10000),
  evidenceRequired:    z.boolean().default(false),
  status:              z.enum(['DRAFT','PUBLISHED']).default('DRAFT'),
});

const updateCSRSchema = createCSRSchema.partial();

const statusSchema = z.object({
  status: z.enum(['DRAFT','PUBLISHED','REGISTRATION_CLOSED','ONGOING','COMPLETED','ARCHIVED']),
});

const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const err = new Error('Validation error');
    err.name = 'ZodError';
    err.errors = result.error.errors;
    return next(err);
  }
  req.body = result.data;
  next();
};

module.exports = {
  validateCreate: validateBody(createCSRSchema),
  validateUpdate: validateBody(updateCSRSchema),
  validateStatus: validateBody(statusSchema),
};
