package bridge

import "plotkitycat/internal/appstate"

func (a *App) GetOnboardingState() (OnboardingState, error) {
	state, err := a.appStateStore.LoadOnboarding()
	if err != nil {
		return OnboardingState{}, err
	}
	return mapOnboardingState(state), nil
}

func (a *App) ResolveOnboardingState(version string, templateAvailable bool) (OnboardingState, error) {
	state, err := a.appStateStore.ResolveOnboarding(version, templateAvailable)
	if err != nil {
		return OnboardingState{}, err
	}
	return mapOnboardingState(state), nil
}

func (a *App) UpdateOnboardingState(version string, status string, lastStep int) (OnboardingState, error) {
	state, err := a.appStateStore.SaveOnboarding(version, status, lastStep)
	if err != nil {
		return OnboardingState{}, err
	}
	return mapOnboardingState(state), nil
}

func mapOnboardingState(state appstate.OnboardingState) OnboardingState {
	return OnboardingState{
		Version:           state.Version,
		Status:            state.Status,
		LastStep:          state.LastStep,
		SuppressionReason: state.SuppressionReason,
		UpdatedAt:         state.UpdatedAt,
	}
}
