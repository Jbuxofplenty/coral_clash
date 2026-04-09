import os

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

def setup_folders():
    base_dir = 'fastlane/metadata'
    
    for code, (ios_locale, android_locale) in languages.items():
        # iOS folders
        ios_path = os.path.join(base_dir, ios_locale)
        os.makedirs(ios_path, exist_ok=True)
        release_notes_file = os.path.join(ios_path, 'release_notes.txt')
        if not os.path.exists(release_notes_file):
            with open(release_notes_file, 'w') as f:
                f.write(f"Release notes for {ios_locale}")
        
        # Android folders
        android_path = os.path.join(base_dir, 'android', android_locale, 'changelogs')
        os.makedirs(android_path, exist_ok=True)
        changelog_file = os.path.join(android_path, 'default.txt')
        if not os.path.exists(changelog_file):
            with open(changelog_file, 'w') as f:
                f.write(f"Release notes for {android_locale}")

    print("✅ Created directory structure for 16 languages in fastlane/metadata")

if __name__ == "__main__":
    setup_folders()
