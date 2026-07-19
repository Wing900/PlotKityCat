package env

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func newParser(onProgress func(Progress)) *archiveProgressParser {
	return newArchiveProgressParser(onProgress)
}

func TestArchiveProgressParser_ParsesPercent(t *testing.T) {
	var got Progress
	p := newParser(func(pr Progress) { got = pr })
	p.consume("Extracting 50%")
	assert.Equal(t, 55, got.Percent) // 24 + int(50*62/100) = 24 + 31 = 55
}

func TestArchiveProgressParser_ClampsTo100(t *testing.T) {
	var got Progress
	p := newParser(func(pr Progress) { got = pr })
	p.consume("done 200%")
	assert.Equal(t, 86, got.Percent) // 24 + int(100*62/100) = 24 + 62 = 86
}

func TestArchiveProgressParser_IgnoresNonProgressLines(t *testing.T) {
	called := false
	p := newParser(func(Progress) { called = true })
	p.consume("no percent here")
	assert.False(t, called)
}

func TestArchiveProgressParser_NilCallbackNoPanic(t *testing.T) {
	p := newParser(nil)
	assert.NotPanics(t, func() { p.consume("50%") })
}

func TestArchiveProgressParser_MonotonicNoRegression(t *testing.T) {
	var last int
	p := newParser(func(pr Progress) { last = pr.Percent })
	p.consume("10%") // 24 + 6 = 30
	first := last
	p.consume("5%") // 24 + 3 = 27 < 30, 不应回退
	assert.Equal(t, first, last)
}

func TestArchiveProgressParser_WriteSplitsNewlines(t *testing.T) {
	var percents []int
	p := newParser(func(pr Progress) { percents = append(percents, pr.Percent) })
	_, err := p.Write([]byte("10%\r\n20%\n"))
	assert.NoError(t, err)
	assert.NotEmpty(t, percents)
}