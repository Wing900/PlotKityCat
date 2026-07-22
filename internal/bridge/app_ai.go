package bridge

import (
	settingspkg "plotkitycat/internal/settings"
)

func (a *App) GetAISettings() (AIProviderSettings, error) {
	if a.aiSettingsStore == nil {
		return AIProviderSettings{Mode: "free"}, nil
	}

	value, err := a.aiSettingsStore.Load()
	if err != nil {
		return AIProviderSettings{}, err
	}

	return AIProviderSettings{
		Mode:  value.Mode,
		URL:   value.URL,
		Key:   value.Key,
		Model: value.Model,
	}, nil
}

func (a *App) SaveAISettings(settings AIProviderSettings) (AIProviderSettings, error) {
	if a.aiSettingsStore == nil {
		return settings, nil
	}

	value, err := a.aiSettingsStore.Save(settingspkg.AIProviderSettings{
		Mode:  settings.Mode,
		URL:   settings.URL,
		Key:   settings.Key,
		Model: settings.Model,
	})
	if err != nil {
		return AIProviderSettings{}, err
	}

	return AIProviderSettings{
		Mode:  value.Mode,
		URL:   value.URL,
		Key:   value.Key,
		Model: value.Model,
	}, nil
}
