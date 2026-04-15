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
	@# Generate metadata ONLY inside the contents/ directory
	@cp $(METADATA_SRC) $(PKG_DIR)/metadata.json
	@echo "Metadata generated at $(PKG_DIR)/metadata.json"

# Install the script using the contents/ directory as the package root
install: build
	@echo "Installing $(NAME) ($(MODE)) from ./$(PKG_DIR)..."
	kpackagetool6 --type=KWin/Script -i $(PKG_DIR)

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

# Reload logic: Clean uninstall -> Install from contents/ -> Load & Run
reload: build
	@echo "--- REFRESHING NUMBIS ($(MODE)) ---"
	@# 1. Unload and Uninstall existing
	@echo "Cleaning old instance..."
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME)
	-kpackagetool6 --type=KWin/Script -r $(NAME)
	@# 2. Install fresh from the package directory
	@echo "Installing fresh package from ./$(PKG_DIR)..."
	kpackagetool6 --type=KWin/Script -i $(PKG_DIR)
	@# 3. Load and Run in KWin session
	@echo "Loading $(NAME) into KWin session..."
	-qdbus6 org.kde.KWin /Scripting reconfigure
	@ID=$$(qdbus6 org.kde.KWin /Scripting loadScript $(NAME)); \
	echo "Script ID: $$ID"; \
	qdbus6 org.kde.KWin /Scripting/Script$$ID run
	@echo "--- DONE ---"

# View KWin logs for Numbis
logs:
	journalctl -b 0 --user-unit=plasma-kwin_wayland.service -f | grep -i "NUMBIS"

clean:
	rm -f $(PKG_DIR)/*.js
	rm -f $(PKG_DIR)/metadata.json
	rm -rf $(PKG_DIR)/code
