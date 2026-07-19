package bridge

import (
	"errors"

	"plotkitycat/internal/screening"
)

func (a *App) handleScreeningContextMenu(sceneHwnd, ownerHwnd uintptr) {
	if a.screeningZoomService == nil {
		return
	}
	action := a.screeningZoomService.ShowContextMenu(ownerHwnd)
	switch action {
	case "livezoom-on", "livezoom-off":
		_ = a.screeningZoomService.ToggleLiveZoom()
	case "draw-toggle":
		_ = a.screeningZoomService.ToggleDraw()
	}
}

func (a *App) ToggleScreeningLiveZoom() error {
	if a.screeningZoomService == nil {
		return errors.New("缩放服务未初始化")
	}
	return a.screeningZoomService.ToggleLiveZoom()
}

func (a *App) ToggleScreeningDraw() error {
	if a.screeningZoomService == nil {
		return errors.New("缩放服务未初始化")
	}
	return a.screeningZoomService.ToggleDraw()
}

func mapScreeningState(state screening.SessionState) ScreeningSessionState {
	return ScreeningSessionState{
		Active:           state.Active,
		SceneNames:       append([]string(nil), state.SceneNames...),
		CurrentIndex:     state.CurrentIndex,
		CurrentSceneName: state.CurrentSceneName,
		PoolSize:         state.PoolSize,
		Animation:        state.Animation,
	}
}