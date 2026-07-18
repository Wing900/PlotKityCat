package bridge

const (
	EventAppReady              = "app:ready"
	EventAppError              = "app:error"
	EventEnvironmentStatus     = "env:status"
	EventEnvironmentProgress   = "env:progress"
	EventScriptsLoaded         = "scripts:loaded"
	EventScriptSaved           = "script:saved"
	EventRunStarted            = "run:started"
	EventRunReady              = "run:ready"
	EventRunFinished           = "run:finished"
	EventRunStopped            = "run:stopped"
	EventRunFailed             = "run:failed"
	EventAIWorkflowStarted     = "ai:workflow_started"
	EventAIWorkflowState       = "ai:workflow_state_changed"
	EventAIWorkflowApplied     = "ai:workflow_code_applied"
	EventAIWorkflowSucceeded   = "ai:workflow_succeeded"
	EventAIWorkflowFailed      = "ai:workflow_failed"
	EventAIWorkflowStopped     = "ai:workflow_interrupted"
	EventScreeningState        = "screening:state"
	EventDesignCardStarted     = "designcard:started"
	EventDesignCardSucceeded   = "designcard:succeeded"
	EventDesignCardFailed      = "designcard:failed"
	EventDesignCardInterrupted = "designcard:interrupted"
)

type EventPayload struct {
	Filename string `json:"filename,omitempty"`
	Message  string `json:"message,omitempty"`
}

type RunErrorPayload struct {
	Filename  string `json:"filename"`
	ErrorType string `json:"errorType"`
	Traceback string `json:"traceback"`
	Error     string `json:"error"`
}
