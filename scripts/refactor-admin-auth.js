// Script para refactorizar automáticamente los endpoints admin
const fs = require('fs');
const path = require('path');

const filesToRefactor = [
  'src/app/api/admin/clientes/route.ts',
  'src/app/api/admin/clientes/[id]/route.ts',
  'src/app/api/admin/clientes/[id]/actividades/route.ts',
  'src/app/api/admin/configuracion/route.ts',
  'src/app/api/admin/debug-auto/route.ts',
  'src/app/api/admin/eventos/route.ts',
  'src/app/api/admin/eventos/[id]/route.ts',
  'src/app/api/admin/exportar-visitas/route.ts',
  'src/app/api/admin/feedback/route.ts',
  'src/app/api/admin/metricas/route.ts',
  'src/app/api/admin/niveles/route.ts',
  'src/app/api/admin/niveles/[id]/route.ts',
  'src/app/api/admin/reevaluar-niveles/route.ts',
  'src/app/api/admin/reportes/descuentos/route.ts',
  'src/app/api/admin/test-push/route.ts',
  'src/app/api/eventos-especiales/route.ts',
];

const oldImportPattern = /import { NextRequest, NextResponse } from 'next\/server'\nimport { prisma } from '@\/lib\/prisma'/g;
const newImport = `import { NextRequest, NextResponse } from 'next/server'\nimport { prisma } from '@/lib/prisma'\nimport { requireAdminAuth } from '@/lib/middleware/admin-auth'`;

const oldAuthPattern = /const adminKey = req\.headers\.get\('x-admin-key'\)\s*\n\s*if \((?:!)?adminKey (?:!==|===) process\.env\.ADMIN_KEY\) {\s*\n\s*return NextResponse\.json\([^)]+\), { status: 401 }\)\s*\n\s*}/gm;
const newAuth = `const authError = requireAdminAuth(req)\n    if (authError) return authError`;

let totalChanges = 0;
let filesProcessed = 0;

filesToRefactor.forEach((file) => {
  const fullPath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changes = 0;
  
  // Agregar import si no existe
  if (!content.includes('requireAdminAuth')) {
    content = content.replace(oldImportPattern, newImport);
    changes++;
  }
  
  // Reemplazar todas las validaciones de auth
  const matches = content.match(oldAuthPattern);
  if (matches) {
    content = content.replace(oldAuthPattern, newAuth);
    changes += matches.length;
  }
  
  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ ${file} - ${changes} cambios`);
    totalChanges += changes;
    filesProcessed++;
  } else {
    console.log(`⏭️  ${file} - sin cambios necesarios`);
  }
});

console.log(`\n📊 Resumen:`);
console.log(`   Archivos procesados: ${filesProcessed}`);
console.log(`   Total de cambios: ${totalChanges}`);
console.log(`   Ahorro estimado: ~${totalChanges * 3} líneas de código\n`);
