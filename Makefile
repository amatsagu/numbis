# Makefile for Numbis - KWin Script Development

# --- CONFIGURATION ---
NAME_DEV = numbis-dev
NAME = numbis
BUILD_DIR = contents/src

.PHONY: build install uninstall reload clean logs uninstall-all

# Build the TypeScript project
build:
	@echo "Building Numbis (CommonJS Bundle)..."
	npm run build

# Install as DEVELOPMENT version
install: build
	@echo "Installing $(NAME_DEV)..."
	@cp metadata-dev.json metadata.json
	kpackagetool6 --type=KWin/Script -i .

# Uninstall DEVELOPMENT version
uninstall:
	@echo "Uninstalling $(NAME_DEV)..."
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME_DEV)
	-kpackagetool6 --type=KWin/Script -r $(NAME_DEV)
	@# Backup cleanup just in case
	-rm -rf $(HOME)/.local/share/kwin/scripts/$(NAME_DEV)

# Deep clean of any Numbis scripts
uninstall-all:
	@echo "Uninstalling all Numbis versions..."
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME_DEV)
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME_REL)
	-kpackagetool6 --type=KWin/Script -r $(NAME_DEV)
	-kpackagetool6 --type=KWin/Script -r $(NAME_REL)
	-rm -rf $(HOME)/.local/share/kwin/scripts/numbis*
	@echo "Cleaning KWin configuration cache..."
	-kbuildsycoca6 --noincremental

# Reload logic: uninstall old -> install new -> dbus run
reload: build
	@echo "--- REFRESHING NUMBIS DEVELOPMENT ---"
	@# 1. Ensure clean slate
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME_DEV)
	-kpackagetool6 --type=KWin/Script -r $(NAME_DEV)
	@# 2. Build metadata
	@cp metadata-dev.json metadata.json
	@# 3. Install
	kpackagetool6 --type=KWin/Script -i .
	@# 4. Reload into KWin session
	@echo "Loading into KWin session..."
	@ID=$$(qdbus6 org.kde.KWin /Scripting loadScript "$$(pwd)/contents/src/main.js" $(NAME_DEV)); \
	echo "Script ID: $$ID"; \
	qdbus6 org.kde.KWin /Scripting/Script$$ID run
	@echo "--- DONE ---"

# View KWin logs for Numbis
logs:
	journalctl -b 0 --user-unit=plasma-kwin_wayland.service -f | grep -i "NUMBIS"

clean:
	rm -rf $(BUILD_DIR)/*.js
	rm -f metadata.json
