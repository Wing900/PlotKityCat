package version

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCurrent_ReturnsNonEmptyVersion(t *testing.T) {
	v := Current()
	assert.NotEmpty(t, v)
	assert.True(t, strings.Count(v, ".") >= 1, "version should look semver-ish: %s", v)
}

func TestCurrent_DeterministicAcrossCalls(t *testing.T) {
	assert.Equal(t, Current(), Current())
}