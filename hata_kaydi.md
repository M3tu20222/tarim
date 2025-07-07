
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