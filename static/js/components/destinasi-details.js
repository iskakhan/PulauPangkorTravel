export function buildDestinasiDetails(destinasi) {
  if (!destinasi) {
    return '';
  }

  const rows = [
    ['Jenis', destinasi.destinasi_type],
    ['Tempoh', destinasi.estimated_duration],
    ['Masa terbaik', destinasi.recommended_time],
    ['Harga', destinasi.price_range],
    ['Rating', formatRating(destinasi)],
    ['Kemudahan', joinList(destinasi.facilities)],
    ['Tags', joinList(destinasi.tags)],
  ].filter(([, value]) => value);

  if (rows.length === 0 && !destinasi.description && !destinasi.subtitle) {
    return '';
  }

  return `
    <section class="detail-section destinasi-details">
      <div class="detail-section-heading">
        <span class="section-kicker">Destinasi</span>
        <h4>${escapeHtml(destinasi.title || 'Info pelancongan')}</h4>
      </div>
      ${destinasi.subtitle ? `<p class="detail-subtitle">${escapeHtml(destinasi.subtitle)}</p>` : ''}
      ${destinasi.description ? `<p>${escapeHtml(destinasi.description)}</p>` : ''}
      ${rows.length ? `
        <dl class="detail-grid">
          ${rows.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join('')}
        </dl>
      ` : ''}
    </section>
  `;
}

function formatRating(destinasi) {
  if (!destinasi.rating) {
    return '';
  }

  const reviews = destinasi.total_reviews ? ` (${destinasi.total_reviews} ulasan)` : '';
  return `${destinasi.rating}${reviews}`;
}

function joinList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }
  return value || '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
