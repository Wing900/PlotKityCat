package operations

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"

	"plotkitycat/internal/aicode/runstate"
)

func TestBuildError_Error(t *testing.T) {
	e := &BuildError{Kind: BuildErrorKindAI, Err: errors.New("boom")}
	assert.Equal(t, "boom", e.Error())
}

func TestBuildError_Unwrap(t *testing.T) {
	inner := errors.New("inner")
	e := &BuildError{Kind: BuildErrorKindPatch, Err: inner}
	assert.Equal(t, inner, e.Unwrap())
}

func TestRepairErrorText_FirstAttemptUsesErrorText(t *testing.T) {
	req := BuildRequest{Attempt: 1, ErrorText: "original err"}
	assert.Equal(t, "original err", req.repairErrorText())
}

func TestRepairErrorText_RetryWithoutLastFailureFallsBack(t *testing.T) {
	req := BuildRequest{Attempt: 3, ErrorText: "fallback"}
	assert.Equal(t, "fallback", req.repairErrorText())
}

func TestRepairErrorText_RetryWithLastFailureUsesFailureText(t *testing.T) {
	req := BuildRequest{
		Attempt:     2,
		ErrorText:   "fallback",
		LastFailure: &runstate.NormalizedRunFailure{ErrorText: "last failure"},
	}
	assert.Equal(t, "last failure", req.repairErrorText())
}