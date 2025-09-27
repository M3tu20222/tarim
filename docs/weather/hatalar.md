http://localhost:3000/dashboard/weather
Sayfası hiç gelmedi
TypeError: direction.includes is not a function
    at getWindDirectionColor (webpack-internal:///(app-pages-browser)/./app/dashboard/weather/page.tsx:158:23)
    at WeatherDashboardPage (webpack-internal:///(app-pages-browser)/./app/dashboard/weather/page.tsx:448:78)
    at Object.react_stack_bottom_frame (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:23553:20)
    at renderWithHooks (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:6764:22)
    at updateFunctionComponent (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:9070:19)
    at beginWork (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:10680:18)
    at runWithFiberInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:873:30)
    at performUnitOfWork (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:15678:22)
    at workLoopSync (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:15498:41)
    at renderRootSync (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:15478:11)
    at performWorkOnRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14985:44)
    at performWorkOnRootViaSchedulerTask (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16767:7)
    at MessagePort.performWorkUntilDeadline (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/scheduler/cjs/scheduler.development.js:45:48)

    E:\Web_site\mart\tar…eather\page.tsx:174 Uncaught TypeError: direction.includes is not a function
    at getWindDirectionColor (E:\Web_site\mart\tar…her\page.tsx:174:19)
    at WeatherDashboardPage (E:\Web_site\mart\tar…her\page.tsx:268:44)
getWindDirectionColor	@	E:\Web_site\mart\tar…eather\page.tsx:174
WeatherDashboardPage	@	E:\Web_site\mart\tar…eather\page.tsx:268
"use server"		
(app-pages-browser)/./node_modules/next/dist/client/app-index.js	@	main-app.js?v=1758987380060:159
(app-pages-browser)/./node_modules/next/dist/client/app-next-dev.js	@	main-app.js?v=1758987380060:181
__webpack_exec__	@	main-app.js?v=1758987380060:1779
(anonymous)	@	main-app.js?v=1758987380060:1780
(anonymous)	@	main-app.js?v=1758987380060:9

