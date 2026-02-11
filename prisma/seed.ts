// prisma/seed.ts
import { PrismaClient, FuenteOrigen } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Niveles ─────────────────────────────────────────────────────────────────
  const bronce = await prisma.nivel.upsert({
    where: { nombre: 'Bronce' },
    update: {},
    create: {
      nombre: 'Bronce',
      orden: 1,
      criterios: { visitas: 0, diasVentana: 30, usosCruzados: 0 }, // nivel de entrada
    },
  })

  const plata = await prisma.nivel.upsert({
    where: { nombre: 'Plata' },
    update: {},
    create: {
      nombre: 'Plata',
      orden: 2,
      criterios: { visitas: 6, diasVentana: 30, usosCruzados: 0 },
    },
  })

  const oro = await prisma.nivel.upsert({
    where: { nombre: 'Oro' },
    update: {},
    create: {
      nombre: 'Oro',
      orden: 3,
      criterios: { visitas: 12, diasVentana: 30, usosCruzados: 2 },
    },
  })

  const platino = await prisma.nivel.upsert({
    where: { nombre: 'Platino' },
    update: {},
    create: {
      nombre: 'Platino',
      orden: 4,
      criterios: { visitas: 20, diasVentana: 30, usosCruzados: 5 },
    },
  })

  console.log('✅ Niveles creados:', bronce.nombre, plata.nombre, oro.nombre, platino.nombre)

  // ─── Locales ─────────────────────────────────────────────────────────────────
  const coques = await prisma.local.upsert({
    where: { apiKey: 'coques-api-key-dev-change-in-prod' },
    update: {},
    create: {
      nombre: 'Coques',
      tipo: 'cafeteria',
      apiKey: 'coques-api-key-dev-change-in-prod',
      layoutMesas: {
        ancho: 600,
        alto: 400,
        mesas: [
          { id: 'm1', nombre: '1', x: 20, y: 20, w: 70, h: 70 },
          { id: 'm2', nombre: '2', x: 110, y: 20, w: 70, h: 70 },
          { id: 'm3', nombre: '3', x: 200, y: 20, w: 70, h: 70 },
          { id: 'm4', nombre: '4', x: 290, y: 20, w: 70, h: 70 },
          { id: 'm5', nombre: '5', x: 20, y: 110, w: 70, h: 70 },
          { id: 'm6', nombre: '6', x: 110, y: 110, w: 70, h: 70 },
          { id: 'barra', nombre: 'Barra', x: 400, y: 20, w: 160, h: 40 },
        ],
      },
    },
  })

  const lavadero = await prisma.local.upsert({
    where: { apiKey: 'lavadero-api-key-dev-change-in-prod' },
    update: {},
    create: {
      nombre: 'Lavadero',
      tipo: 'lavadero',
      apiKey: 'lavadero-api-key-dev-change-in-prod',
      layoutMesas: null,
    },
  })

  console.log('✅ Locales creados:', coques.nombre, lavadero.nombre)

  // ─── Mesas de Coques ─────────────────────────────────────────────────────────
  const mesasData = [
    { nombre: '1', posX: 3.3, posY: 5, ancho: 11.7, alto: 17.5 },
    { nombre: '2', posX: 18.3, posY: 5, ancho: 11.7, alto: 17.5 },
    { nombre: '3', posX: 33.3, posY: 5, ancho: 11.7, alto: 17.5 },
    { nombre: '4', posX: 48.3, posY: 5, ancho: 11.7, alto: 17.5 },
    { nombre: '5', posX: 3.3, posY: 27.5, ancho: 11.7, alto: 17.5 },
    { nombre: '6', posX: 18.3, posY: 27.5, ancho: 11.7, alto: 17.5 },
    { nombre: 'Barra', posX: 66.7, posY: 5, ancho: 26.7, alto: 10 },
  ]

  for (const mesa of mesasData) {
    await prisma.mesa.upsert({
      where: { id: `${coques.id}-mesa-${mesa.nombre}` },
      update: {},
      create: {
        id: `${coques.id}-mesa-${mesa.nombre}`,
        localId: coques.id,
        ...mesa,
      },
    })
  }

  console.log('✅ Mesas de Coques creadas')

  // ─── Beneficios ──────────────────────────────────────────────────────────────
  const cafeLavadero = await prisma.beneficio.upsert({
    where: { id: 'beneficio-cafe-lavadero' },
    update: {},
    create: {
      id: 'beneficio-cafe-lavadero',
      nombre: 'Café gratis — Lavadero',
      descripcionCaja: 'BENEFICIO LAVADERO - Café cortesía (no cobrar)',
      condiciones: { maxPorDia: 1, maxPorMes: 10, duracionMinutos: 90 },
      requiereEstadoExterno: true,
      estadoExternoTrigger: 'EN_LAVADO',
      localDestinoId: coques.id,
    },
  })

  const descuentoBienvenida = await prisma.beneficio.upsert({
    where: { id: 'beneficio-bienvenida' },
    update: {},
    create: {
      id: 'beneficio-bienvenida',
      nombre: 'Descuento bienvenida 10%',
      descripcionCaja: 'BENEFICIO BIENVENIDA - Descuento 10% (aplicar manualmente)',
      condiciones: { maxPorCliente: 1, usoUnico: true },
      requiereEstadoExterno: false,
    },
  })

  console.log('✅ Beneficios creados')

  // ─── Asignar beneficios a niveles ─────────────────────────────────────────────
  // Bienvenida → Bronce en adelante
  for (const nivelId of [bronce.id, plata.id, oro.id, platino.id]) {
    await prisma.nivelBeneficio.upsert({
      where: {
        nivelId_beneficioId: { nivelId, beneficioId: descuentoBienvenida.id },
      },
      update: {},
      create: { nivelId, beneficioId: descuentoBienvenida.id },
    })
  }

  // Café lavadero → Plata en adelante
  for (const nivelId of [plata.id, oro.id, platino.id]) {
    await prisma.nivelBeneficio.upsert({
      where: {
        nivelId_beneficioId: { nivelId, beneficioId: cafeLavadero.id },
      },
      update: {},
      create: { nivelId, beneficioId: cafeLavadero.id },
    })
  }

  console.log('✅ Beneficios asignados a niveles')

  // ─── Cliente de prueba ───────────────────────────────────────────────────────
  await prisma.cliente.upsert({
    where: { phone: '+5491100000001' },
    update: {},
    create: {
      phone: '+5491100000001',
      nombre: 'Cliente Test',
      email: 'test@coques.com',
      estado: 'ACTIVO',
      nivelId: plata.id,
      fuenteOrigen: FuenteOrigen.MANUAL,
      consentimientoAt: new Date(),
      otpSecret: 'JBSWY3DPEHPK3PXP', // secret de prueba — cambiar en prod
    },
  })

  console.log('✅ Cliente de prueba creado: +5491100000001')
  console.log('\n🎉 Seed completado')
  console.log('\nAPI Keys de desarrollo:')
  console.log('  Coques:    coques-api-key-dev-change-in-prod')
  console.log('  Lavadero:  lavadero-api-key-dev-change-in-prod')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
