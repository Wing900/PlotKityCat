package startupdiag

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStartupErrorMessage_NilErrUsesDefault(t *testing.T) {
	msg := StartupErrorMessage(nil)
	assert.Contains(t, msg, "PlotKityCat failed to start.")
}

func TestStartupErrorMessage_WithErrIncludesError(t *testing.T) {
	msg := StartupErrorMessage(errors.New("disk full"))
	assert.Contains(t, msg, "PlotKityCat failed to start.")
	assert.Contains(t, msg, "disk full")
}