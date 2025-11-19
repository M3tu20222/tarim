Burada yapılanlardan sonra anasayfada hata görünüyor, hydration
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <HotReload assetPrefix="" globalError={[...]}>
      <AppDevOverlayErrorBoundary globalError={[...]}>
        <ReplaySsrOnlyErrors>
        <DevRootHTTPAccessFallbackBoundary>
          <HTTPAccessFallbackBoundary notFound={<NotAllowedRootHTTPFallbackError>}>
            <HTTPAccessFallbackErrorBoundary pathname="/" notFound={<NotAllowedRootHTTPFallbackError>} ...>
              <RedirectBoundary>
                <RedirectErrorBoundary router={{...}}>
                  <Head>
                  <link>
                  <RootLayout>
                    <html lang="tr" suppressHydrationWarning={true} className="dark">
                      <body
                        className="min-h-screen bg-background font-sans antialiased cyberpunk-grid __variable_852510"
-                       data-atm-ext-installed="1.29.12"
                      >
                  ...

---

process işlem başlatırken hata: 
POST http://localhost:3000/api/processes 500 (Internal Server Error)
fetchCallImpl @ main.js?attr=zJv5KGxZnO3EdvIgvuxYkT0jqAVxD3pI6FFl-fIRW0Nj99Zmwxtm515esPp0wPpfCw94qL8nf5J3VcmnAC2GaA:2655
window.fetch @ main.js?attr=zJv5KGxZnO3EdvIgvuxYkT0jqAVxD3pI6FFl-fIRW0Nj99Zmwxtm515esPp0wPpfCw94qL8nf5J3VcmnAC2GaA:2657
handleNext @ E:\Web_site\mart\tarim-yonetim-sistemi\components\processes\process-form.tsx:465
await in handleNext
executeDispatch @ react-dom-client.development.js:16922
runWithFiberInDEV @ react-dom-client.development.js:873
processDispatchQueue @ react-dom-client.development.js:16972
eval @ react-dom-client.development.js:17573
batchedUpdates$1 @ react-dom-client.development.js:3313
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17126
dispatchEvent @ react-dom-client.development.js:21309
dispatchDiscreteEvent @ react-dom-client.development.js:21277Understand this error
E:\Web_site\mart\tarim-yonetim-sistemi\components\processes\process-form.tsx:485 API Error (Initiate): {error: 'İşlem başlatılırken bir hata oluştu. Lütfen tekrar deneyin.'}

Error initiating process: ReferenceError: fieldIdParam is not defined
    at POST (app\api\processes\route.ts:290:4)
  288 |     console.log("[Cache] Invalidating processes tags after process creation");
  289 |     revalidateTag("processes");
> 290 |     if (fieldIdParam) {
      |    ^
  291 |       revalidateTag(`processes-field-${fieldId}`);
  292 |     }
  293 |
 POST /api/processes 500 in 8221ms