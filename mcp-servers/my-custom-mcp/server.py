# server.py - Launcher Script
import sys
from pathlib import Path

# Bu betiğin bulunduğu dizini al
script_dir = Path(__file__).parent

# Ana sunucu betiğinin yolunu oluştur
main_script = script_dir / "main.py"

# Ana sunucuyu doğrudan çalıştır
if __name__ == "__main__":
    # Python yorumlayıcısı ile main.py dosyasını çalıştır
    import subprocess
    import os
    
    # Çalışma dizinini ayarla
    os.chdir(script_dir)
    
    # main.py dosyasını çalıştır
    result = subprocess.run([sys.executable, str(main_script)], 
                          capture_output=False, 
                          text=True)
    sys.exit(result.returncode)
