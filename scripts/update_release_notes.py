import os
import json

# Mapping from project code to (iOS locale, Android locale)
languages = {
    'en': ('en-US', 'en-US'),
    'hi': ('hi', 'hi-IN'),
    'fr': ('fr-FR', 'fr-FR'),
    'es': ('es-ES', 'es-ES'),
    'pt': ('pt-BR', 'pt-BR'),
    'zh': ('zh-Hans', 'zh-CN'),
    'ur': ('ur', 'ur'),
    'bn': ('bn', 'bn-BD'),
    'my': ('my', 'my-MM'),
    'ar': ('ar-SA', 'ar-SA'),
    'de': ('de-DE', 'de-DE'),
    'ru': ('ru', 'ru-RU'),
    'id': ('id', 'id'),
    'uz': ('uz', 'uz'),
    'tr': ('tr', 'tr-TR'),
    'pl': ('pl', 'pl-PL'),
}

def update_metadata():
    json_path = 'fastlane/release_notes.json'
    if not os.path.exists(json_path):
        print(f"❌ Error: {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        notes = json.load(f)

    base_dir = 'fastlane/metadata'
    
    for code, (ios_locale, android_locale) in languages.items():
        if code not in notes:
            print(f"⚠️ Warning: No release notes found for {code}, skipping.")
            continue
            
        note_content = notes[code]
        
        # Update iOS file
        ios_path = os.path.join(base_dir, ios_locale)
        os.makedirs(ios_path, exist_ok=True)
        ios_file = os.path.join(ios_path, 'release_notes.txt')
        with open(ios_file, 'w', encoding='utf-8') as f:
            f.write(note_content)
        
        # Update Android file
        android_path = os.path.join(base_dir, 'android', android_locale, 'changelogs')
        os.makedirs(android_path, exist_ok=True)
        android_file = os.path.join(android_path, 'default.txt')
        with open(android_file, 'w', encoding='utf-8') as f:
            f.write(note_content)

    print(f"✅ Successfully updated metadata files from {json_path}")

if __name__ == "__main__":
    update_metadata()
