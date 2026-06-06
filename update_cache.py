import os
import re

js_dir = '/Users/iskakhanzo/Desktop/Development/Pangkor_Web/static/js'

for root, _, files in os.walk(js_dir):
    for f in files:
        if f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r') as file:
                content = file.read()
            
            # Replace .js' or .js" or .js?v=something' with .js?v=5'
            # Also handle backticks if they are used for imports
            content = re.sub(r'\.js(\?v=\d+)?([\'"`])', r'.js?v=5\2', content)
            
            with open(path, 'w') as file:
                file.write(content)
print("Done updating JS imports")
