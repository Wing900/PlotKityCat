package bridge

import "plotkitycat/internal/ai/usage"

// GetUsageToday reports how many tokens this app has used today across all
// AI modes, as recorded from the usage field returned by each server.
func (a *App) GetUsageToday() (UsageToday, error) {
	if a.usageStore == nil {
		return UsageToday{}, nil
	}
	return mapUsageToday(a.usageStore.Today()), nil
}

// newUsageStore opens the per-day usage counter. If the config directory
// cannot be resolved it degrades to an in-memory counter instead of failing
// startup.
func newUsageStore() *usage.Store {
	path, err := usage.DefaultPath()
	if err != nil {
		path = ""
	}
	return usage.NewStore(path)
}

func mapUsageToday(s usage.Snapshot) UsageToday {
	return UsageToday{
		Date:             s.Date,
		PromptTokens:     s.PromptTokens,
		CompletionTokens: s.CompletionTokens,
		TotalTokens:      s.TotalTokens,
		Requests:         s.Requests,
	}
}
