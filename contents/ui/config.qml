import QtQuick 2.0
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import org.kde.kcm 1.6 as KCM

KCM.ConfigModule {
    id: root

    ColumnLayout {
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: 10

        CheckBox {
            id: enabledCheckBox
            text: i18n("Enable Numbis Tiling")
            checked: kcfg_Enabled
            onCheckedChanged: kcfg_Enabled = checked
        }

        CheckBox {
            id: hideTitleBarsCheckBox
            text: i18n("Hide Title Bars (Hyprland style)")
            checked: kcfg_HideTitleBars
            onCheckedChanged: kcfg_HideTitleBars = checked
        }

        RowLayout {
            Label {
                text: i18n("Gaps (px):")
            }
            SpinBox {
                id: gapsSpinBox
                from: 0
                to: 100
                value: kcfg_Gaps
                onValueChanged: kcfg_Gaps = value
            }
        }

        RowLayout {
            Label {
                text: i18n("Master Key:")
            }
            TextField {
                id: masterKeyField
                text: kcfg_MasterKey
                onTextChanged: kcfg_MasterKey = text
                placeholderText: "e.g. Shift, Meta, Alt"
            }
        }

        RowLayout {
            Label {
                text: i18n("Terminal:")
            }
            TextField {
                id: terminalField
                text: kcfg_TerminalEmulator
                onTextChanged: kcfg_TerminalEmulator = text
                placeholderText: "e.g. alacritty"
            }
        }
    }
}
