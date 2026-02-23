# 📋 Información EXACTA para tu Administrador

## ✅ Configuración DNS Requerida

**IMPORTANTE:** Vercel te asignó un CNAME específico para tu proyecto.

```
Tipo: CNAME
Nombre: app
Valor: dd27e2dbb2add99f.vercel-dns-017.com
TTL: 3600 (o automático)
```

---

## 📧 Email para tu Administrador (COPIA Y PEGA)

```
Hola,

Necesito configurar el subdominio app.coques.com.ar para la aplicación 
de fidelización.

CONFIGURACIÓN DNS:

Tipo de registro: CNAME
Nombre/Host: app
Valor/Apunta a: dd27e2dbb2add99f.vercel-dns-017.com
TTL: 3600 (o el valor por defecto)

NOTAS:
- Es un registro CNAME (no IP)
- El valor es específico de nuestro proyecto en Vercel
- Una vez configurado puede tardar de minutos a horas en propagarse
- El SSL se configurará automáticamente

Gracias.
```

---

## ℹ️ Explicación de lo que ves en Vercel

### "Invalid Configuration" ⚠️

**Es NORMAL.** Significa que Vercel todavía no puede verificar el dominio porque:
- Tu admin no configuró el DNS todavía
- O lo configuró pero no se propagó todavía

**Una vez que el DNS esté configurado**, cambiará a:
```
✅ app.coques.com.ar - Active
```

### El CNAME específico

Vercel te dio: `dd27e2dbb2add99f.vercel-dns-017.com`

**Esto es MEJOR que el genérico** (`cname.vercel-dns.com`) porque:
- ✅ Es específico de tu proyecto
- ✅ Mejor performance
- ✅ Más control
- ✅ Es el nuevo sistema de Vercel

**Nota:** Vercel dice que el viejo (`cname.vercel-dns.com`) seguirá funcionando, pero recomiendan usar el nuevo.

---

## 🎯 Próximos Pasos

### 1. Ahora (vos):
- ✅ Ya agregaste el dominio en Vercel
- ✅ Ya tenés el CNAME específico
- 📧 Enviar la info a tu admin (email de arriba)

### 2. Tu admin:
- ⏳ Configurar el CNAME en el DNS
- ⏳ Avisarte cuando esté listo

### 3. Después (automático):
- ⏳ Esperar propagación DNS (5 min - 48 hrs)
- ⏳ Vercel verificará automáticamente cada pocos minutos
- ✅ Cuando esté listo, cambiará a "Active"
- ✅ SSL se generará automáticamente

### 4. Una vez activo (vos):
- Configurar variable en Vercel: `NEXT_PUBLIC_APP_URL=https://app.coques.com.ar`
- Redeploy
- ¡Probar!

---

## 🔄 Cómo Saber si Está Funcionando

### En Vercel:
Ir a Settings → Domains y revisar el estado:

- ⚠️ **"Invalid Configuration"** = todavía no configurado/propagado
- ⏳ **"Pending"** = configurado, esperando propagación
- ✅ **"Active"** = ¡funcionando!

### Manualmente (CMD):
```cmd
nslookup app.coques.com.ar
```

**Funcionando:**
```
Name:    dd27e2dbb2add99f.vercel-dns-017.com
Addresses:  76.76.21.xxx (IPs de Vercel)
Aliases:  app.coques.com.ar
```

**No configurado todavía:**
```
*** app.coques.com.ar can't find app.coques.com.ar: Non-existent domain
```

---

## 📊 Timeline Estimado

| Tiempo | Evento |
|--------|--------|
| **Ahora** | Enviás info al admin ✅ |
| **+10 min** | Admin configura DNS ⚙️ |
| **+15-60 min** | DNS se propaga 🌐 |
| **+65 min** | Vercel verifica → "Active" ✅ |
| **+70 min** | Configurás env var y redeploy 🚀 |
| **+75 min** | ¡Funcionando! 🎉 |

**Total:** 1-3 horas (puede ser más rápido o más lento según DNS)

---

## ❓ FAQ

### ¿Es normal que diga "Invalid Configuration"?

**Sí, totalmente normal.** Significa que el DNS no está configurado todavía.

### ¿Por qué el CNAME es diferente al de la documentación?

Vercel actualizó su sistema. Antes usaban un CNAME genérico (`cname.vercel-dns.com`), ahora asignan CNAMEs específicos por proyecto. **Es mejor así.**

### ¿Puedo seguir usando el viejo CNAME genérico?

Técnicamente sí (Vercel dice que seguirá funcionando), pero **recomendamos usar el nuevo** que te muestra Vercel. Es el futuro.

### ¿Tengo que hacer algo más en Vercel?

No. Una vez que tu admin configure el DNS:
- Vercel verificará automáticamente
- Generará el SSL automáticamente
- Todo se activa solo

Solo tenés que esperar.

---

## 🎯 Resumen Ultra Corto

**Para tu admin:**
```
CNAME: app → dd27e2dbb2add99f.vercel-dns-017.com
```

**Estado actual:** ⚠️ Esperando que el admin configure el DNS

**Próximo paso:** Enviar email al admin con la info del CNAME

**¡Todo está bien! Es normal que diga "Invalid Configuration" antes de configurar el DNS.**
