package bridge

import "plotkitycat/internal/designcards/session"

type designCardEventSink struct {
	app *App
}

func newDesignCardEventSink(app *App) designCardEventSink {
	return designCardEventSink{app: app}
}

func (s designCardEventSink) Started(e session.StartedEvent) {
	s.app.emit(EventDesignCardStarted, DesignCardStartedEvent{
		SessionID: e.SessionID,
		SceneName: e.SceneName,
		Kind:      e.Kind,
	})
}

func (s designCardEventSink) Succeeded(e session.SucceededEvent) {
	s.app.emit(EventDesignCardSucceeded, DesignCardSucceededEvent{
		SessionID: e.SessionID,
		SceneName: e.SceneName,
		Card:      mapDesignCard(e.Card),
		Source:    e.Source,
	})
}

func (s designCardEventSink) Failed(e session.FailedEvent) {
	s.app.emit(EventDesignCardFailed, DesignCardFailedEvent{
		SessionID: e.SessionID,
		SceneName: e.SceneName,
		ErrorText: e.ErrorText,
	})
}

func (s designCardEventSink) Interrupted(e session.InterruptedEvent) {
	s.app.emit(EventDesignCardInterrupted, DesignCardInterruptedEvent{
		SessionID: e.SessionID,
		SceneName: e.SceneName,
		Message:   e.Message,
	})
}