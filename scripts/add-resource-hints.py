#!/usr/bin/env python3
"""
Add resource hints (preload/prefetch) to HTML files for better performance.
This script adds preload hints for critical assets and preconnect for external domains.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
PUBLIC_DIR = BASE_DIR / 'public'

# Critical CSS files to preload (in order of importance)
CRITICAL_CSS = [
    'assets/css/variables.css',
    'assets/css/skeletons.css',
    'css/style.css',
]

# Critical JS files to preload
CRITICAL_JS = [
    'assets/js/config.js',
    'assets/js/load-header-standard.js',
]

# External domains to preconnect
EXTERNAL_DOMAINS = [
    ('https://fonts.googleapis.com', ''),
    ('https://fonts.gstatic.com', 'crossorigin'),
    ('https://lebanon-locals-media.s3.me-south-1.amazonaws.com', ''),
]

def add_resource_hints(html_file):
    """Add resource hints to HTML file if not already present"""
    content = html_file.read_text(encoding='utf-8')
    original_content = content
    
    # Find the </head> tag
    head_end_match = re.search(r'</head>', content, re.IGNORECASE)
    if not head_end_match:
        print(f'  No </head> tag found, skipping...')
        return False
    
    # Check if hints already exist
    has_preconnect = 'rel="preconnect"' in content
    has_preload = 'rel="preload"' in content
    
    if has_preconnect and has_preload:
        print(f'  Resource hints already present, skipping...')
        return False
    
    # Build hint tags
    hint_tags = []
    
    # Add preconnect for external domains
    if not has_preconnect:
        for domain, crossorigin in EXTERNAL_DOMAINS:
            crossorigin_attr = f' crossorigin' if crossorigin else ''
            hint_tags.append(f'    <link rel="preconnect" href="{domain}"{crossorigin_attr}>')
        hint_tags.append('')  # Empty line for readability
    
    # Add preload for critical CSS (only if file exists in HTML)
    if not has_preload:
        for css_path in CRITICAL_CSS:
            # Only add if the CSS file is actually referenced in the HTML
            if css_path in content or css_path.replace('assets/', '') in content:
                hint_tags.append(f'    <link rel="preload" href="{css_path}" as="style">')
        
        # Add preload for critical JS (only if file exists in HTML)
        for js_path in CRITICAL_JS:
            if js_path in content or js_path.replace('assets/', '') in content:
                hint_tags.append(f'    <link rel="preload" href="{js_path}" as="script">')
    
    if not hint_tags:
        print(f'  No hints to add, skipping...')
        return False
    
    hints_html = '\n'.join(hint_tags) + '\n'
    
    # Insert before </head> (or after charset/viewport if present)
    # Try to insert after viewport meta tag for better organization
    viewport_match = re.search(r'<meta\s+name="viewport"[^>]*>', content, re.IGNORECASE)
    if viewport_match:
        insert_pos = viewport_match.end()
        # Find next newline
        next_newline = content.find('\n', insert_pos)
        if next_newline != -1:
            insert_pos = next_newline + 1
        content = content[:insert_pos] + '\n    <!-- Resource Hints -->\n' + hints_html + content[insert_pos:]
    else:
        # Fallback to before </head>
        insert_pos = head_end_match.start()
        content = content[:insert_pos] + '\n    <!-- Resource Hints -->\n' + hints_html + content[insert_pos:]
    
    # Write back
    html_file.write_text(content, encoding='utf-8')
    return True

def main():
    """Process all HTML files"""
    print('Adding resource hints to HTML files...\n')
    
    html_files = list(PUBLIC_DIR.rglob('*.html'))
    # Exclude includes and admin panel
    html_files = [
        f for f in html_files 
        if 'includes' not in f.parts and 'admin_panel' not in f.parts
    ]
    
    updated_count = 0
    for html_file in html_files:
        rel_path = html_file.relative_to(BASE_DIR)
        print(f'Processing {rel_path}...')
        
        if add_resource_hints(html_file):
            updated_count += 1
            print(f'  Added resource hints')
        print()
    
    print(f'Updated {updated_count} file(s)')

if __name__ == '__main__':
    main()

