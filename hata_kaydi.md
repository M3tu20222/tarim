*/Çözüldü/*
http://localhost:3000/dashboard/owner/irrigation sayfasında   bir kaydı silerken hata :
FFailed to load resource: the server responded with a status of 500 (Internal Server Error)

intercept-console-error.js:50 Sulama kaydı silme hatası: Error: Sulama kaydı silinemedi.
    at deleteIrrigationLog (E:\Web_site\mart\tar…ion-list.tsx:196:15)
error	@	intercept-console-error.js:50

---
Error: Route "/api/irrigation/[irrigationId]" used `params.irrigationId`. `params` should be awaited before using its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis
    at DELETE (app\api\irrigation\[irrigationId]\route.ts:273:12)
  271 |     }
  272 |
> 273 |     const { irrigationId } = params;
      |            ^
  274 |     if (!irrigationId) {
  275 |       return NextResponse.json({ error: "Sulama ID'si eksik." }, { status: 400 });
  276 |     }
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
Transaction failed: Error [PrismaClientKnownRequestError]: 
Invalid `prisma.irrigationInventoryOwnerUsage.deleteMany()` invocation:


Transaction API error: Transaction not found. Transaction ID is invalid, refers to an old closed transaction Prisma doesn't have information about anymore, or was obtained before disconnecting.
    at async eval (app\api\irrigation\[irrigationId]\route.ts:326:10)
    at async DELETE (app\api\irrigation\[irrigationId]\route.ts:279:6)
  324 |
  325 |         if (inventoryUsageIdsToDelete.length > 0) {
> 326 |           await tx.irrigationInventoryOwnerUsage.deleteMany({
      |          ^
  327 |             where: { irrigationInventoryUsageId: { in: inventoryUsageIdsToDelete } },
  328 |           });
  329 |         } {
  code: 'P2028',
  meta: [Object],
  clientVersion: '6.7.0'
}
 DELETE /api/irrigation/686bb87cb54572e9e939eae4 500 in 7457ms


 yeni hata vercelde deploy ederken
 [15:23:02.143] Running build in Washington, D.C., USA (East) – iad1
[15:23:02.143] Build machine configuration: 2 cores, 8 GB
[15:23:02.159] Cloning github.com/M3tu20222/tarim (Branch: main, Commit: ae772cc)
[15:23:02.770] Cloning completed: 611.000ms
[15:23:04.873] Restored build cache from previous deployment (G9WxngDZh5jrCU8NdeFtAP5kc62s)
[15:23:05.555] Running "vercel build"
[15:23:05.993] Vercel CLI 44.2.12
[15:23:06.343] Running "install" command: `npm install`...
[15:23:08.920] 
[15:23:08.921] up to date, audited 640 packages in 2s
[15:23:08.921] 
[15:23:08.921] 165 packages are looking for funding
[15:23:08.921]   run `npm fund` for details
[15:23:08.948] 
[15:23:08.949] 3 low severity vulnerabilities
[15:23:08.949] 
[15:23:08.949] To address issues that do not require attention, run:
[15:23:08.950]   npm audit fix
[15:23:08.950] 
[15:23:08.950] To address all issues (including breaking changes), run:
[15:23:08.950]   npm audit fix --force
[15:23:08.950] 
[15:23:08.950] Run `npm audit` for details.
[15:23:08.985] Detected Next.js version: 15.2.3
[15:23:08.986] Running "prisma generate && next build"
[15:23:09.531] Prisma schema loaded from prisma/schema.prisma
[15:23:09.960] Warning: You did not specify an output path for your `generator` in schema.prisma. This behavior is deprecated and will no longer be supported in Prisma 7.0.0. To learn more visit https://pris.ly/cli/output-path
[15:23:10.542] 
[15:23:10.543] ✔ Generated Prisma Client (v6.7.0) to ./node_modules/@prisma/client in 514ms
[15:23:10.543] 
[15:23:10.543] Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
[15:23:10.543] 
[15:23:10.543] Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
[15:23:10.543] 
[15:23:11.400]    ▲ Next.js 15.2.3
[15:23:11.400] 
[15:23:11.479]    Creating an optimized production build ...
[15:23:40.824] Failed to compile.
[15:23:40.824] 
[15:23:40.824] ./app/doc/page.tsx
[15:23:40.824] Module not found: Can't resolve 'swagger-ui-react'
[15:23:40.824] 
[15:23:40.824] https://nextjs.org/docs/messages/module-not-found
[15:23:40.824] 
[15:23:40.825] ./app/doc/page.tsx
[15:23:40.825] Module not found: Can't resolve 'swagger-ui-react/swagger-ui.css'
[15:23:40.825] 
[15:23:40.825] https://nextjs.org/docs/messages/module-not-found
[15:23:40.825] 
[15:23:40.825] ./app/api/doc/swagger/route.ts
[15:23:40.825] Module not found: Can't resolve 'swagger-jsdoc'
[15:23:40.825] 
[15:23:40.825] https://nextjs.org/docs/messages/module-not-found
[15:23:40.825] 
[15:23:40.838] 
[15:23:40.839] > Build failed because of webpack errors
[15:23:40.859] Error: Command "prisma generate && next build" exited with 1
[15:23:41.179] 
[15:23:43.970] Exiting build container