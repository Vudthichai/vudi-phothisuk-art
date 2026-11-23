#!/usr/bin/env python3
"""Development-only browser compilation against a running Vite server.

Requires Python Playwright; no compiler or camera permission is shipped on the certificate page.
"""
import argparse,hashlib,json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base',default='http://localhost:5173');p.add_argument('--experience',default='mother-nature-original')
a=p.parse_args();repo=Path(__file__).resolve().parents[1]
experiences=json.loads((repo/'src/ar/experiences.json').read_text());experience=next(e for e in experiences if e['id']==a.experience)
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page()
 page.goto(a.base.rstrip('/')+'/tools/ar/compile-target.html?target='+experience['targetImage'])
 page.wait_for_function('window.targetCompilation || window.targetCompilationError',timeout=240000)
 error=page.evaluate('window.targetCompilationError')
 if error:raise RuntimeError(error)
 compiled=page.evaluate('({stats:window.targetCompilation.stats,bytes:window.targetCompilation.bytes})')
 target=repo/'public'/experience['targetFile'].lstrip('/')
 with page.expect_download() as download:page.get_by_role('link',name='Download compiled target').click()
 download.value.save_as(target)
 meta_path=(repo/'public'/experience['targetImage'].lstrip('/')).with_suffix('.json')
 meta=json.loads(meta_path.read_text());meta.update({'compiler':{'name':'MindAR','version':'1.2.5','featureLevels':compiled['stats'][0]['keyframes'],'matchingFeatures':compiled['stats'][0]['matchingFeatures']},'compiledTargetSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'compiledBytes':compiled['bytes']})
 meta_path.write_text(json.dumps(meta,indent=2)+'\n');browser.close()
 print(f'Compiled {target.name}: {compiled}')
