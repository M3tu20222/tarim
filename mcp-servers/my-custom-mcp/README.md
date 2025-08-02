# Tarım Yönetim Sistemi - Özel MCP Sunucusu

Bu klasör, Tarım Yönetim Sistemi projesi için özel araçlar içeren bir MCP (Meta-Code-Protocol) sunucusu barındırır. Sunucu, Cline gibi uyumlu istemciler tarafından kullanılmak üzere tasarlanmıştır.

## Yetenekler

Bu sunucu, aşağıdaki araçları tek bir çatı altında birleştirir:

1.  **Proje Sözlüğü (Glossary):**
    *   `get_definition(term)`: Belirtilen terimin tanımını getirir.
    *   `add_definition(term, definition)`: Sözlüğe yeni bir terim ve tanım ekler.
    *   `list_terms()`: Sözlükteki tüm terimleri listeler.
    *   Sözlük verileri, bu klasördeki `glossary.json` dosyasında saklanır.

2.  **Kod Tarayıcı (Code Scanner):**
    *   `scan_project_files(directory_path)`: Belirtilen bir dizindeki (varsayılan olarak proje kök dizini) tüm kod dosyalarını tarar ve içeriklerini birleştirilmiş bir metin olarak döndürür.
    *   `node_modules`, `.git` gibi yaygın olarak kullanılan ve gereksiz olan dizinleri tarama dışında bırakır.

## Dosya Yapısı

-   `server.py`: Ana sunucu mantığını içeren Python betiği.
-   `requirements.txt`: Sunucunun çalışması için gereken Python paketleri.
-   `test_server.py`: Sunucunun araçlarını test etmek için kullanılan betik.
-   `start_server.bat`: Sunucuyu manuel olarak başlatmak için Windows toplu iş dosyası.
-   `glossary.json`: Sözlük terimlerinin ve tanımlarının saklandığı veri dosyası (ilk kullanımdan sonra otomatik olarak oluşturulur).

## Kurulum ve Kullanım

### Bağımlılıklar

Sunucuyu çalıştırmadan önce gerekli Python paketlerini yükleyin:

```bash
pip install -r requirements.txt
```

### Test Etme

Sunucunun doğru çalışıp çalışmadığını kontrol etmek için test betiğini çalıştırın:

```bash
python test_server.py
```

### Cline Entegrasyonu

Bu sunucuyu Cline (veya benzeri bir MCP istemcisi) ile kullanmak için, istemcinin ayar dosyasına aşağıdaki gibi bir yapılandırma eklenmelidir:

```json
"tarim_mcp": {
  "command": "python",
  "args": ["E:/Web_site/mart/tarim-yonetim-sistemi/mcp-servers/my-custom-mcp/server.py"],
  "type": "stdio",
  "timeout": 60
}
```
*Not: `args` içindeki dosya yolunu kendi sisteminizdeki mutlak yolla değiştirmeyi unutmayın.*