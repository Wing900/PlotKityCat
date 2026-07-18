package designcards

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	cardsDirName      = "design_cards"
	planFileName      = "plan.py"
	svgFileName       = "preview.svg"
	metaFileName    = "meta.json"
	versionFileName = ".ai-design-versions.json"
	maxVersions       = 50
)

var cardIDPattern = regexp.MustCompile(`^card-(\d{3})$`)

type sceneDirResolver interface {
	SceneDir(sceneName string) (string, error)
}

type Store struct {
	scenes sceneDirResolver
}

func NewStore(scenes sceneDirResolver) *Store {
	return &Store{scenes: scenes}
}

func (s *Store) List(sceneName string) ([]Card, error) {
	root, err := s.cardsRoot(sceneName)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(root)
	if os.IsNotExist(err) {
		return []Card{}, nil
	}
	if err != nil {
		return nil, err
	}

	cards := make([]Card, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		card, err := s.Get(sceneName, entry.Name())
		if err != nil {
			return nil, err
		}
		cards = append(cards, card)
	}

	sort.SliceStable(cards, func(i, j int) bool {
		if cards[i].Meta.Order == cards[j].Meta.Order {
			return cards[i].Meta.ID < cards[j].Meta.ID
		}
		return cards[i].Meta.Order < cards[j].Meta.Order
	})

	return cards, nil
}

func (s *Store) Get(sceneName string, cardID string) (Card, error) {
	cardDir, err := s.cardDir(sceneName, cardID)
	if err != nil {
		return Card{}, err
	}

	meta, err := s.readMeta(filepath.Join(cardDir, metaFileName))
	if err != nil {
		return Card{}, err
	}

	plan, err := os.ReadFile(filepath.Join(cardDir, planFileName))
	if err != nil {
		return Card{}, err
	}

	svg, err := os.ReadFile(filepath.Join(cardDir, svgFileName))
	if err != nil {
		return Card{}, err
	}

	return Card{
		Meta: meta,
		Plan: string(plan),
		SVG:  string(svg),
	}, nil
}

func (s *Store) Create(sceneName string, title string, plan string, svg string) (Card, error) {
	root, err := s.cardsRoot(sceneName)
	if err != nil {
		return Card{}, err
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return Card{}, err
	}

	cardID, err := s.nextCardID(root)
	if err != nil {
		return Card{}, err
	}

	now := time.Now().UnixMilli()
	meta := Meta{
		ID:        cardID,
		CreatedAt: now,
		UpdatedAt: now,
		Title:     firstNonEmpty(title, cardID),
		Order:     s.nextOrder(sceneName),
	}

	card := Card{
		Meta: meta,
		Plan: strings.TrimSpace(plan),
		SVG:  strings.TrimSpace(svg),
	}
	if err := s.writeCard(sceneName, card); err != nil {
		return Card{}, err
	}
	if err := s.writeVersions(sceneName, cardID, []Version{}); err != nil {
		return Card{}, err
	}

	return card, nil
}

func (s *Store) UpdatePlan(sceneName string, cardID string, plan string) (Card, error) {
	card, err := s.Get(sceneName, cardID)
	if err != nil {
		return Card{}, err
	}

	card.Plan = strings.TrimSpace(plan)
	card.Meta.UpdatedAt = time.Now().UnixMilli()
	if err := s.writeCard(sceneName, card); err != nil {
		return Card{}, err
	}

	return card, nil
}

func (s *Store) UpdateContent(sceneName string, cardID string, title string, plan string, svg string) (Card, error) {
	card, err := s.Get(sceneName, cardID)
	if err != nil {
		return Card{}, err
	}

	card.Meta.Title = firstNonEmpty(strings.TrimSpace(title), card.Meta.Title, card.Meta.ID)
	card.Meta.UpdatedAt = time.Now().UnixMilli()
	card.Plan = strings.TrimSpace(plan)
	card.SVG = strings.TrimSpace(svg)
	if err := s.writeCard(sceneName, card); err != nil {
		return Card{}, err
	}

	return card, nil
}

func (s *Store) Delete(sceneName string, cardID string) error {
	cardDir, err := s.cardDir(sceneName, cardID)
	if err != nil {
		return err
	}

	return os.RemoveAll(cardDir)
}

func (s *Store) ListVersions(sceneName string, cardID string) ([]Version, error) {
	versions, err := s.readVersions(sceneName, cardID)
	if err != nil {
		return nil, err
	}

	sort.SliceStable(versions, func(i, j int) bool {
		return versions[i].CreatedAt < versions[j].CreatedAt
	})
	return relabelVersions(versions), nil
}

func (s *Store) CreateVersion(sceneName string, cardID string, note string, plan string, svg string) (Version, error) {
	versions, err := s.readVersions(sceneName, cardID)
	if err != nil {
		return Version{}, err
	}

	now := time.Now()
	version := Version{
		ID:        fmt.Sprintf("%d", now.UnixNano()),
		Label:     "",
		Note:      firstNonEmpty(strings.TrimSpace(note), "AI 优化设计卡版本"),
		Plan:      strings.TrimSpace(plan),
		SVG:       strings.TrimSpace(svg),
		CreatedAt: now.UnixMilli(),
	}
	versions = append(versions, version)
	if len(versions) > maxVersions {
		versions = versions[len(versions)-maxVersions:]
	}
	versions = relabelVersions(versions)
	if err := s.writeVersions(sceneName, cardID, versions); err != nil {
		return Version{}, err
	}

	for _, item := range versions {
		if item.ID == version.ID {
			return item, nil
		}
	}

	return version, nil
}

func (s *Store) cardsRoot(sceneName string) (string, error) {
	sceneDir, err := s.scenes.SceneDir(sceneName)
	if err != nil {
		return "", err
	}

	return filepath.Join(sceneDir, cardsDirName), nil
}

func (s *Store) cardDir(sceneName string, cardID string) (string, error) {
	root, err := s.cardsRoot(sceneName)
	if err != nil {
		return "", err
	}

	return filepath.Join(root, cardID), nil
}

func (s *Store) writeCard(sceneName string, card Card) error {
	cardDir, err := s.cardDir(sceneName, card.Meta.ID)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(cardDir, 0o755); err != nil {
		return err
	}

	if err := os.WriteFile(filepath.Join(cardDir, planFileName), []byte(strings.TrimSpace(card.Plan)+"\n"), 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(cardDir, svgFileName), []byte(strings.TrimSpace(card.SVG)+"\n"), 0o644); err != nil {
		return err
	}

	content, err := json.MarshalIndent(card.Meta, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(cardDir, metaFileName), append(content, '\n'), 0o644)
}

func (s *Store) nextCardID(root string) (string, error) {
	entries, err := os.ReadDir(root)
	if os.IsNotExist(err) {
		return "card-001", nil
	}
	if err != nil {
		return "", err
	}

	maxID := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		matches := cardIDPattern.FindStringSubmatch(entry.Name())
		if len(matches) != 2 {
			continue
		}

		var value int
		if _, err := fmt.Sscanf(matches[1], "%d", &value); err == nil && value > maxID {
			maxID = value
		}
	}

	return fmt.Sprintf("card-%03d", maxID+1), nil
}

func (s *Store) nextOrder(sceneName string) int {
	cards, err := s.List(sceneName)
	if err != nil {
		return 1
	}

	maxOrder := 0
	for _, card := range cards {
		if card.Meta.Order > maxOrder {
			maxOrder = card.Meta.Order
		}
	}

	return maxOrder + 1
}

func (s *Store) readMeta(path string) (Meta, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return Meta{}, err
	}

	var meta Meta
	if err := json.Unmarshal(content, &meta); err != nil {
		return Meta{}, fmt.Errorf("读取 design card meta 失败: %w", err)
	}

	return meta, nil
}

func (s *Store) readVersions(sceneName string, cardID string) ([]Version, error) {
	cardDir, err := s.cardDir(sceneName, cardID)
	if err != nil {
		return nil, err
	}

	content, err := os.ReadFile(filepath.Join(cardDir, versionFileName))
	if os.IsNotExist(err) {
		return []Version{}, nil
	}
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(string(content)) == "" {
		return []Version{}, nil
	}

	var versions []Version
	if err := json.Unmarshal(content, &versions); err != nil {
		return nil, fmt.Errorf("读取 design card 版本失败: %w", err)
	}

	return versions, nil
}

func (s *Store) writeVersions(sceneName string, cardID string, versions []Version) error {
	cardDir, err := s.cardDir(sceneName, cardID)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(cardDir, 0o755); err != nil {
		return err
	}

	content, err := json.MarshalIndent(relabelVersions(versions), "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(cardDir, versionFileName), append(content, '\n'), 0o644)
}

func relabelVersions(versions []Version) []Version {
	next := make([]Version, len(versions))
	copy(next, versions)
	sort.SliceStable(next, func(i, j int) bool {
		return next[i].CreatedAt < next[j].CreatedAt
	})
	for index := range next {
		next[index].Label = fmt.Sprintf("版本%02d", index+1)
	}

	return next
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}

	return ""
}
