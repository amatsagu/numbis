import QtQuick 2.0
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import org.kde.kcm 1.6 as KCM

KCM.ConfigModule {
    id: root

    ColumnLayout {
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: 15

        CheckBox {
            text: i18n("Enable Numbis Tiling")
            checked: kcfg_Enabled
            onCheckedChanged: kcfg_Enabled = checked
        }

        GroupBox {
            title: i18n("Gaps")
            Layout.fillWidth: true
            ColumnLayout {
                CheckBox {
                    text: i18n("Use Smart Gaps (gaps for single window)")
                    checked: kcfg_UseSmartGaps
                    onCheckedChanged: kcfg_UseSmartGaps = checked
                }
                RowLayout {
                    Label { text: i18n("Gaps Threshold (ignore gaps if window > % of screen):") }
                    SpinBox {
                        value: kcfg_GapsThreshold * 100
                        onValueChanged: kcfg_GapsThreshold = value / 100
                        from: 0; to: 100
                        stepSize: 5
                    }
                }
                GridLayout {
                    columns: 4
                    Label { text: i18n("Top:") }
                    SpinBox { value: kcfg_GapsUp; onValueChanged: kcfg_GapsUp = value; from: 0; to: 100 }
                    Label { text: i18n("Right:") }
                    SpinBox { value: kcfg_GapsRight; onValueChanged: kcfg_GapsRight = value; from: 0; to: 100 }
                    Label { text: i18n("Bottom:") }
                    SpinBox { value: kcfg_GapsDown; onValueChanged: kcfg_GapsDown = value; from: 0; to: 100 }
                    Label { text: i18n("Left:") }
                    SpinBox { value: kcfg_GapsLeft; onValueChanged: kcfg_GapsLeft = value; from: 0; to: 100 }
                }
            }
        }

        GroupBox {
            title: i18n("System")
            Layout.fillWidth: true
            ColumnLayout {
                RowLayout {
                    Label { text: i18n("Master Shortcut Key:") }
                    TextField {
                        text: kcfg_MasterKey
                        onTextChanged: kcfg_MasterKey = text
                        placeholderText: "Shift, Meta, Alt"
                    }
                }
                RowLayout {
                    Label { text: i18n("Terminal Emulator:") }
                    TextField {
                        text: kcfg_TerminalEmulator
                        onTextChanged: kcfg_TerminalEmulator = text
                    }
                }
            }
        }
    }
}
