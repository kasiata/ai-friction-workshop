"""Compatibility entry point: regenerate both worksheets from their HTML source."""
from pathlib import Path
import runpy, subprocess, sys
subprocess.run([sys.executable,str(Path(__file__).with_name("localize.py"))],check=True)
runpy.run_path(str(Path(__file__).with_name('make-sheets.py')),run_name='__main__')
