/index.css doesn't exist at build time, it will remain unchanged to be resolved at runtime
✓ 17 modules transformed.
✗ Build failed in 2.26s
error during build:
[vite:esbuild] Transform failed with 1 error:
E:/gitProjeler/weather/components/WeatherDashboard.tsx:380:84: ERROR: Syntax error "n"
file: E:/gitProjeler/weather/components/WeatherDashboard.tsx:380:84

Syntax error "n"
378|        <GeminiInterpretation text={interpretation} loading={isGeminiLoading} onAnalyze={handleGeminiAnalysis} />
379|
380|        {/* Performance Stats */}\n      {process.env.NODE_ENV === 'development' && (\n        <section className=\"mt-8\">\n          <details className=\"glass p-4 rounded-lg\">\n            <summary className=\"text-sm text-gray-400 cursor-pointer\">Cache İstatistikleri (Geliştirici)</summary>\n            <div className=\"mt-2 text-xs text-gray-500 space-y-1\">\n              <div>Toplam Cache: {cacheStats.totalEntries}</div>\n              <div>Geçerli: {cacheStats.validEntries}</div>\n              <div>Süresi Dolmuş: {cacheStats.expiredEntries}</div>\n              <div>Hit Oranı: {(cacheStats.hitRatio * 100).toFixed(1)}%</div>\n              <div>Aktif İstekler: {cacheStats.activeRequests}</div>\n              <div>Son Güncelleme: {cacheStats.lastUpdate}</div>\n            </div>\n          </details>\n        </section>\n      )}
   |                                                                                      ^
381|      </div>
382|    );

    at failureErrorWithLog (E:\gitProjeler\weather\node_modules\esbuild\lib\main.js:1467:15)
    at E:\gitProjeler\weather\node_modules\esbuild\lib\main.js:736:50
    at responseCallbacks.<computed> (E:\gitProjeler\weather\node_modules\esbuild\lib\main.js:603:9)
    at handleIncomingPacket (E:\gitProjeler\weather\node_modules\esbuild\lib\main.js:658:12)
    at Socket.readFromStdout (E:\gitProjeler\weather\node_modules\esbuild\lib\main.js:581:7)
    at Socket.emit (node:events:519:28)
    at addChunk (node:internal/streams/readable:559:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
    at Readable.push (node:internal/streams/readable:390:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:191:23)