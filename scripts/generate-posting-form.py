#!/usr/bin/env python3
"""
Generate posting.html form structure from edit-posting.html
Organizes form fields into 6 wizard steps for each listing type
"""

import re
from pathlib import Path

# Read edit-posting.html
edit_file = Path('public/edit-posting.html')
if not edit_file.exists():
    print("Error: edit-posting.html not found")
    exit(1)

content = edit_file.read_text(encoding='utf-8')

# Extract experience form
exp_match = re.search(r'<!-- Experience Form -->(.*?)<!-- Event Form -->', content, re.DOTALL)
if exp_match:
    exp_form = exp_match.group(1)
    print("Found experience form")
else:
    print("Warning: Experience form not found")
    exp_form = ""

# Extract event form  
evt_match = re.search(r'<!-- Event Form -->(.*?)<!-- Stay Form -->', content, re.DOTALL)
if evt_match:
    evt_form = evt_match.group(1)
    print("Found event form")
else:
    print("Warning: Event form not found")
    evt_form = ""

# Extract stay form
stay_match = re.search(r'<!-- Stay Form -->(.*?)(?:<button type="submit"|</form>)', content, re.DOTALL)
if stay_match:
    stay_form = stay_match.group(1)
    print("Found stay form")
else:
    print("Warning: Stay form not found")
    stay_form = ""

print(f"\nExperience form length: {len(exp_form)} chars")
print(f"Event form length: {len(evt_form)} chars")
print(f"Stay form length: {len(stay_form)} chars")

# Note: This script extracts the forms but doesn't organize them into wizard steps
# The forms need to be manually organized into 6 steps each based on the wizard design
print("\nForms extracted. Manual organization into wizard steps required.")

