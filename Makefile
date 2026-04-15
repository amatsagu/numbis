# Makefile for Numbis - KWin Script Development

# --- CONFIGURATION ---
NAME_DEV = numbis-dev
NAME_REL = numbis
BUILD_DIR = contents/code

.PHONY: build install uninstall reload clean logs

# Build the TypeScript project
build:
	@echo "Building Numbis (CommonJS)..."
	npm run build

# Install as DEVELOPMENT version
install: build
	@echo "Installing $(NAME_DEV)..."
	@cp metadata-dev.json metadata.json
	kpackagetool6 --type=KWin/Script -i .

# Uninstall DEVELOPMENT version
uninstall:
	@echo "Uninstalling $(NAME_DEV)..."
	-kpackagetool6 --type=KWin/Script -r $(NAME_DEV)
	@# Backup cleanup just in case
	-rm -rf $(HOME)/.local/share/kwin/scripts/$(NAME_DEV)

# Reload logic: uninstall old -> install new -> dbus run
reload: build
	@echo "--- REFRESHING NUMBIS DEVELOPMENT ---"
	@# 1. Unload from running KWin
	-qdbus6 org.kde.KWin /Scripting unloadScript $(NAME_DEV)
	@# 2. Re-install files
	@cp metadata-dev.json metadata.json
	-kpackagetool6 --type=KWin/Script -r $(NAME_DEV)
	kpackagetool6 --type=KWin/Script -i .
	@# 3. Reload into KWin session
	@echo "Loading into KWin session..."
	@ID=$$(qdbus6 org.kde.KWin /Scripting loadScript "$$(pwd)/contents/code/main.js" $(NAME_DEV)); \
	echo "Script ID: $$ID"; \
	qdbus6 org.kde.KWin /Scripting/Script$$ID run
	@echo "--- DONE ---"

# View KWin logs for Numbis
logs:
	journalctl -b 0 --user-unit=plasma-kwin_wayland.service -f | grep -i "NUMBIS"

clean:
	rm -rf $(BUILD_DIR)/*.js
	rm -f metadata.json
