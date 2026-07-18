package designcards

type Meta struct {
	ID        string `json:"id"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
	Title     string `json:"title"`
	Order     int    `json:"order"`
}

type Card struct {
	Meta Meta
	Plan string
	SVG  string
}

type Version struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Note      string `json:"note"`
	Plan      string `json:"plan"`
	SVG       string `json:"svg"`
	CreatedAt int64  `json:"createdAt"`
}

type SelectionItem struct {
	Kind         string
	Text         string
	Name         string
	Alt          string
	DataURL      string
	RelativePath string
}
