# Makefile for Numbis - KWin Script Development

# --- CONFIGURATION ---
# Set NUMBIS_RELEASE=true for production build
NUMBIS_RELEASE ?= false

ifeq ($(NUMBIS_RELEASE),true)
    NAME = numbis
    METADATA_SRC = metadata-release.json
    MODE = RELEASE
else
    NAME = numbis-dev
    METADATA_SRC = metadata-dev.json
    MODE = DEVELOPMENT
endif

# The self-contained package directory
PKG_DIR = contents

.PHONY: build install uninstall reload clean logs uninstall-all

# Build the TypeScript project
build:
	@echo "Building Numbis ($(MODE) Mode)..."
	npm run build
	@# Generate metadata at the root
	@cp $(METADATA_SRC) metadata.json
	@echo "Metadata generated at metadata.json"

# Install the script using the current directory as the package root
install: build
	@echo "Installing $(NAME) ($(MODE)) from ./..."
	kpackagetool6 --type=KWin/Script -i .

# Uninstall the script (uses the ID, so directory doesn't matter)
uninstall:
	@echo "Uninstalling $(NAME)..."
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME)
	-kpackagetool6 --type=KWin/Script -r $(NAME)

# Deep clean of any Numbis scripts and cache
uninstall-all:
	@echo "Uninstalling all Numbis versions..."
	-qdbus6 org.kde.KWin /Scripting unloadScript numbis
	-qdbus6 org.kde.KWin /Scripting unloadScript numbis-dev
	-kpackagetool6 --type=KWin/Script -r numbis
	-kpackagetool6 --type=KWin/Script -r numbis-dev
	-rm -rf $(HOME)/.local/share/kwin/scripts/numbis*
	@echo "Cleaning KWin configuration cache..."
	-kbuildsycoca6 --noincremental

# Reload logic: Clean uninstall -> Install from . -> Load & Run
reload: build
	@echo "--- REFRESHING NUMBIS ($(MODE)) ---"
	@# 1. Unload and Uninstall existing
	@echo "Cleaning old instance..."
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME)
	-kpackagetool6 --type=KWin/Script -r $(NAME)
	@# 2. Install fresh from the package directory
	@echo "Installing fresh package from ./..."
	kpackagetool6 --type=KWin/Script -i .
	@# 3. Load and Run in KWin session
	@echo "Loading $(NAME) into KWin session..."
	-qdbus6 org.kde.KWin /Scripting reconfigure
	@ID=$$(qdbus6 org.kde.KWin /Scripting loadScript $(NAME)); \
	echo "Script ID: $$ID"; \
	qdbus6 org.kde.KWin /Scripting/Script$$ID run
	@echo "--- DONE ---"

# View KWin logs for Numbis
logs:
	journalctl -f QT_CATEGORY=js QT_CATEGORY=kwin_scripting

clean:
	rm -f contents/code/*.js
	rm -f metadata.json
	rm -rf contents/code/main.js
