**düzeltildi**
POST http://localhost:3000/api/billing/well-periods 400 (Bad Request)
fetchCallImpl @ main.js?attr=A7R7tw-FUj2iT-_m0UlxVAAm7PWD8iKjm3jk1P1W3G6nLV2UiDsvVePfMMNPCc5VyRKdiyhYzhy27Qeo1eLchg:2655
window.fetch @ main.js?attr=A7R7tw-FUj2iT-_m0UlxVAAm7PWD8iKjm3jk1P1W3G6nLV2UiDsvVePfMMNPCc5VyRKdiyhYzhy27Qeo1eLchg:2657
onSubmit @ E:\Web_site\mart\tarim-yonetim-sistemi\components\billing\new-period-form.tsx:63
eval @ index.esm.mjs:2317
await in eval
executeDispatch @ react-dom-client.development.js:16427
runWithFiberInDEV @ react-dom-client.development.js:1511
processDispatchQueue @ react-dom-client.development.js:16477
eval @ react-dom-client.development.js:17075
batchedUpdates$1 @ react-dom-client.development.js:3254
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16631
dispatchEvent @ react-dom-client.development.js:20717
dispatchDiscreteEvent @ react-dom-client.development.js:20685

GET /dashboard/owner/billing/periods 200 in 4708ms
 ○ Compiling /dashboard/owner/billing/periods/new ...
 ✓ Compiled /dashboard/owner/billing/periods/new in 3.7s (4268 modules)
 GET /dashboard/owner/billing/periods/new 200 in 4085ms
API isteği: /api/billing/well-periods
Kullanıcı ID: 67e5b093c8fccd39d1444093, Rol: OWNER
 ○ Compiling /api/billing/well-periods ...
 ✓ Compiled /api/billing/well-periods in 1538ms (4260 modules)
 POST /api/billing/well-periods 400 in 3854ms
 ✓ Compiled /_not-found in 358ms (4264 modules)
 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 559ms
API isteği: /api/billing/well-periods
Kullanıcı ID: 67e5b093c8fccd39d1444093, Rol: OWNER
 POST /api/billing/well-periods 400 in 225ms
 ✓ Compiled in 446ms (2017 modules)
 GET /dashboard/owner/billing/periods/new 200 in 192ms
---
---
---

**düzeldi**
Console Error

A component is changing an uncontrolled input to be controlled. This is likely caused by the value changing from undefined to a defined value, which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component. More info: https://react.dev/link/controlled-components

components\ui\input.tsx (8:7) @ _c


   6 |   ({ className, type, ...props }, ref) => {
   7 |     return (
>  8 |       <input
     |       ^
   9 |         type={type}
  10 |         className={cn(
  11 |           "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
Call Stack
61

Show 53 ignore-listed frame(s)
input
<anonymous> (0:0)
_c
components\ui\input.tsx (8:7)
Object.render
components\billing\new-period-form.tsx (208:17)
FormControl
components\ui\form.tsx (113:5)
Object.render
components\billing\new-period-form.tsx (207:15)
FormField
components\ui\form.tsx (39:7)
NewPeriodForm
components\billing\new-period-form.tsx (201:10)
NewBillingPeriodPage
app\dashboard\owner\billing\periods\new\page.tsx (28:11)
---
---
---

**düzeldi**
 ✓ Compiled in 572ms (2014 modules)
 GET /dashboard/owner/billing/periods/new 200 in 193ms
 ✓ Compiled in 729ms (4187 modules)
 GET /dashboard/owner/billing/periods/new 200 in 264ms
API isteği: /api/billing/well-periods
Kullanıcı ID: 67e5b093c8fccd39d1444093, Rol: OWNER
 ✓ Compiled /api/billing/well-periods in 385ms (2260 modules)
 GET /dashboard/owner/billing/periods/new 200 in 1054ms
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
Error creating well billing period: Error [PrismaClientKnownRequestError]: 
Invalid `prisma.wellBillingIrrigationUsage.create()` invocation:


Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5941 ms passed since the start of the transaction. Consider increasing the interactive transaction timeout or doing less work in the transaction.
    at async eval (app\api\billing\well-periods\route.ts:141:10)
    at async POST (app\api\billing\well-periods\route.ts:116:19)
  139 |           const amount = (totalAmount * percentage) / 100;
  140 |
> 141 |           await tx.wellBillingIrrigationUsage.create({
      |          ^
  142 |             data: {
  143 |               wellBillingPeriodId: wellBillingPeriod.id,
  144 |               irrigationLogId: log.id, {
  code: 'P2028',
  meta: [Object],
  clientVersion: '6.7.0'
}
 POST /api/billing/well-periods 500 in 8211ms

  main.js?attr=A7R7tw-…zhy27Qeo1eLchg:2655 
 POST http://localhost:3000/api/billing/well-periods 500 (Internal Server Error)
fetchCallImpl	@	main.js?attr=A7R7tw-…zhy27Qeo1eLchg:2655
window.fetch	@	main.js?attr=A7R7tw-…zhy27Qeo1eLchg:2657
onSubmit	@	E:\Web_site\mart\tar…-period-form.tsx:73
---
---
---

**Evin Altı İlgili Tarih Aralığında Sulama Kayıtları**
Tarih	Kuyu	Süre	Tarlalar	İşçi	Durum	Not	İşlemler
30 May 202508:45
Evin Altı	
8s 0dk
Sultanın Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



29 May 202522:15
Evin Altı	
8s 0dk
Evin Altı Alt (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



29 May 202509:01
Evin Altı	
5s 0dk
4 Dönümler (Tırtık) (%13)
Mehmet Alt (%20)
Evin Altı Alt (%15)
Ebu Bekir TUNÇEZ	Tamamlandı		



28 May 202522:15
Evin Altı	
8s 0dk
Evin Altı Üst (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



28 May 202515:30
Evin Altı	
1s 30dk
Sultanın Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



27 May 202522:15
Evin Altı	
8s 0dk
Bekirin Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



27 May 202514:30
Evin Altı	
2s 30dk
Cılbağın Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



27 May 202509:15
Evin Altı	
4s 0dk
Evin Altı Alt (%17)
4 Dönümler (Tırtık) (%15)
Mehmet Alt (%20)
Ebu Bekir TUNÇEZ	Tamamlandı		



26 May 202522:15
Evin Altı	
8s 0dk
Mehmet Üst (%30)
Velinin Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



26 May 202507:15
Evin Altı	
6s 20dk
Erolun Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



Tarih	Kuyu	Süre	Tarlalar	İşçi	Durum	Not	İşlemler
25 May 202514:45
Evin Altı	
2s 0dk
Erolun Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



24 May 202522:15
Evin Altı	
8s 0dk
Mehmet Üst (%50)
Mehmet Tunçez	Tamamlandı		



24 May 202506:00
Evin Altı	
3s 0dk
Mehmet Tunçez	DRAFT		



24 May 202506:00
Evin Altı	
3s 0dk
Yeşilin Tarla (%16)
Evin Altı Alt (%8)
4 Dönümler (Tırtık) (%11)
Ebu Bekir TUNÇEZ	Tamamlandı		



23 May 202522:15
Evin Altı	
8s 0dk
Ümmetin Tarla (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



23 May 202512:00
Evin Altı	
3s 0dk
Topal İsmail (%17)
4 Dönümler (Tırtık) (%17)
Ebu Bekir TUNÇEZ	Tamamlandı		



23 May 202509:00
Evin Altı	
3s 0dk
Yeşilin Tarla (%17)
Evin Altı Alt (%17)
Ebu Bekir TUNÇEZ	Tamamlandı		



22 May 202522:15
Evin Altı	
8s 0dk
Ümmetin Tarla (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



22 May 202512:45
Evin Altı	
3s 0dk
Topal İsmail (%17)
Evin Altı Alt (%15)
Ebu Bekir TUNÇEZ	Tamamlandı		



22 May 202509:00
Evin Altı	
3s 0dk
Yeşilin Tarla (%17)
Evin Altı Alt (%15)
Ebu Bekir TUNÇEZ	Tamamlandı		



Tarih	Kuyu	Süre	Tarlalar	İşçi	Durum	Not	İşlemler
21 May 202519:15
Evin Altı	
4s 0dk
Evin Altı Üst (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



21 May 202512:30
Evin Altı	
3s 0dk
Topal İsmail (%20)
4 Dönümler (Tırtık) (%20)
Ebu Bekir TUNÇEZ	Tamamlandı		



21 May 202510:26
Evin Altı	
1s 0dk
Yeşilin Tarla (%20)
Evin Altı Alt (%20.3)
Mehmet Tunçez	Tamamlandı		



20 May 202522:15
Evin Altı	
4s 0dk
Evin Altı Üst (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



20 May 202513:05
Evin Altı	
3s 0dk
Evin Altı Alt (%20.3)
Yeşilin Tarla (%20)
Mehmet Tunçez	Tamamlandı		



20 May 202509:00
Evin Altı	
3s 0dk
Topal İsmail (%20)
Ebu Bekir TUNÇEZ	Tamamlandı		



19 May 202522:15
Evin Altı	
4s 0dk
Bekirin Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



19 May 202513:00
Evin Altı	
3s 0dk
Yeşilin Tarla (%17)
Evin Altı Alt (%17)
Ebu Bekir TUNÇEZ	Tamamlandı		



19 May 202506:00
Evin Altı	
3s 0dk
Topal İsmail (%20)
Ebu Bekir TUNÇEZ	Tamamlandı		



18 May 202522:15
Evin Altı	
4s 0dk
Mehmet Üst (%25)
Velinin Tarla (%100)
Ebu Bekir TUNÇEZ	Tamamlandı		



Tarih	Kuyu	Süre	Tarlalar	İşçi	Durum	Not	İşlemler
17 May 202522:15
Evin Altı	
4s 0dk
Mehmet Üst (%49)
Ebu Bekir TUNÇEZ	Tamamlandı		



17 May 202508:00
Evin Altı	
3s 0dk
Ümmetin Tarla (%50)
Ebu Bekir TUNÇEZ	Tamamlandı		



13 May 202522:15
Evin Altı	
4s 0dk
Bekirin Tarla (%100)
Mehmet Tunçez	Tamamlandı		



12 May 202522:15
Evin Altı	
4s 0dk
Evin Altı Üst (%50)
Mehmet Tunçez	Tamamlandı		



11 May 202522:15
Evin Altı	
3s 45dk
Evin Altı Üst (%50)
Mehmet Tunçez	Tamamlandı		



10 May 202522:00
Evin Altı	
4s 40dk
Velinin Tarla (%100)
Mehmet Üst (%24)
Mehmet Tunçez	Tamamlandı		




Fatura Detayları
PDF Olarak İndir
Ebu Bekir TUNÇEZ
7421.33 TL
Toplam Ödenecek Tutar

Himmet TUNÇEZ
30822.51 TL
Toplam Ödenecek Tutar

Mehmet Tunçez
5835.16 TL
Toplam Ödenecek Tutar

Dönem Özeti
Kuyu Adı
Evin Altı

Dönem
30.04.2025 - 31.05.2025

Toplam Tutar
44079.00 TL

Saatlik Ücret
426.39 TL/saat

Detaylı Dağıtım Listesi
Tarla Adı	Sahip	Süre (saat)	Tutar	Ödeme Durumu
Bekirin Tarla	Ebu Bekir TUNÇEZ	16.00	6822.25 TL	Ödenmedi
Evin Altı Alt	Ebu Bekir TUNÇEZ	0.00	0.00 TL	Ödenmedi
Yeşilin Tarla	Ebu Bekir TUNÇEZ	1.41	599.08 TL	Ödenmedi
4 Dönümler (Tırtık)	Himmet TUNÇEZ	2.69	1146.99 TL	Ödenmedi
Cılbağın Tarla	Himmet TUNÇEZ	2.50	1065.98 TL	Ödenmedi
Erolun Tarla	Himmet TUNÇEZ	8.33	3553.26 TL	Ödenmedi
Evin Altı Alt	Himmet TUNÇEZ	8.40	3582.54 TL	Ödenmedi
Evin Altı Üst	Himmet TUNÇEZ	11.88	5063.39 TL	Ödenmedi
Sultanın Tarla	Himmet TUNÇEZ	9.50	4050.71 TL	Ödenmedi
Topal İsmail	Himmet TUNÇEZ	2.82	1202.42 TL	Ödenmedi
Velinin Tarla	Himmet TUNÇEZ	16.67	7106.51 TL	Ödenmedi
Ümmetin Tarla	Himmet TUNÇEZ	9.50	4050.71 TL	Ödenmedi
Mehmet Alt	Mehmet Tunçez	1.80	767.50 TL	Ödenmedi
Mehmet Üst	Mehmet Tunçez	10.48	4468.58 TL	Ödenmedi
Yeşilin Tarla	Mehmet Tunçez	1.41	599.08 TL	Ödenmedi

###Bu kayıtları tek tek topladığımda toplam süre  158 saat 45 dk çıkıyor, ama 
http://localhost:3000/dashboard/owner/billing/periods/689838fa5c001a13a0473e6b sayfasında fatura detaylarında toplam sulama süresi 158 saat 45 dk yı bulmuyor, pdf'te  toplam süre Toplam Süre 103.38 s görünüyor. 
**istek**
    Bu sorunun kaynağını bulalım