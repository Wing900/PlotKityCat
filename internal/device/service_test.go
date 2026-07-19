package device

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func expectedHash(raw string) string {
	normalized := strings.TrimSpace(strings.ToLower(raw))
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:])
}

func TestID_HashesRawGuid(t *testing.T) {
	s := NewServiceWithProvider(func() (string, error) { return "ABC-123-DEF", nil })
	id, err := s.ID()
	require.NoError(t, err)
	assert.Equal(t, expectedHash("ABC-123-DEF"), id)
	assert.Equal(t, expectedHash("abc-123-def"), id) // 大小写归一
}

func TestID_TrimsWhitespaceBeforeHash(t *testing.T) {
	s := NewServiceWithProvider(func() (string, error) { return "  GUID-1  \n", nil })
	id, err := s.ID()
	require.NoError(t, err)
	assert.Equal(t, expectedHash("guid-1"), id)
}

func TestID_DeterministicForSameInput(t *testing.T) {
	s := NewServiceWithProvider(func() (string, error) { return "stable-guid", nil })
	a, _ := s.ID()
	b, _ := s.ID()
	assert.Equal(t, a, b)
}

func TestID_PropagatesProviderError(t *testing.T) {
	s := NewServiceWithProvider(func() (string, error) { return "", errors.New("no guid") })
	_, err := s.ID()
	assert.ErrorContains(t, err, "no guid")
}

func TestID_IsHexSHA256(t *testing.T) {
	s := NewServiceWithProvider(func() (string, error) { return "x", nil })
	id, err := s.ID()
	require.NoError(t, err)
	assert.Len(t, id, 64) // sha256 hex 长度
	for _, c := range id {
		assert.True(t, (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'), "非 hex 字符: %c", c)
	}
}