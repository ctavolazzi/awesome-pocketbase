import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load OpenAPI specification from YAML file
 */
function loadOpenAPISpec() {
  try {
    const specPath = join(__dirname, 'openapi.yml');
    const specContent = readFileSync(specPath, 'utf8');
    return yaml.load(specContent);
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error.message);
    return null;
  }
}

/**
 * Get Swagger UI options
 */
function getSwaggerUIOptions() {
  return {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PocketBase Demo API Docs',
  };
}

/**
 * Setup Swagger documentation
 */
export function setupSwagger(app) {
  const spec = loadOpenAPISpec();

  if (!spec) {
    console.warn('Swagger documentation not available (failed to load spec)');
    return false;
  }

  // Serve swagger UI
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(spec, getSwaggerUIOptions()));

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.json(spec);
  });

  console.log('📚 API documentation available at /api-docs');
  return true;
}

export default setupSwagger;

