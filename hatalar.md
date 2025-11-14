http://localhost:3000/dashboard/owner/irrigation/new
sayfasında wizard'ın son adımında kaydet butonunda hata var, galiba session'ı değiştirmiştik:
Failed to load resource: the server responded with a status of 400 (Bad Request)Understand this error
E:\Web_site\mart\tarim-yonetim-sistemi\components\irrigation\irrigation-form.tsx:822 Form sonlandırma hatası: Error: session is not defined
    at handleSubmitForm (E:\Web_site\mart\tarim-yonetim-sistemi\components\irrigation\irrigation-form.tsx:815:15)

---

✓ Compiled /api/irrigation/[irrigationId]/finalize in 995ms (4155 modules)
Sulama kaydı sonlandırma hatası: ReferenceError: session is not defined
    at POST.prisma.$transaction.maxWait (app\api\irrigation\[irrigationId]\finalize\route.ts:94:68)
    at async POST (app\api\irrigation\[irrigationId]\finalize\route.ts:74:19)
  92 |
  93 |       // Bildirimleri Oluştur (Mevcut POST'tan taşındı)
> 94 |       const createdByUser = await tx.user.findUnique({ where: { id: session.id } });
     |                                                                    ^
  95 |       const well = irrigationLog.wellId ? await tx.well.findUnique({ where: { id: irrigationLog.wellId } }) : null;
  96 |
  97 |       // Tarla isimlerini topla
 POST /api/irrigation/6916dd6f5e40b05792bcb8ba/finalize 400 in 4079ms
