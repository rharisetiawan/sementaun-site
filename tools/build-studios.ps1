# Regenerates the studio cards in studio/index.html from tools/studios.json.
#
# The cards are written as static HTML (not rendered client-side) so search
# engines can read every listing. js/pages.js only filters the existing DOM.
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-studios.ps1

$ErrorActionPreference = "Stop"

$root      = Split-Path $PSScriptRoot -Parent
$dataPath  = Join-Path $PSScriptRoot "studios.json"
$pagePath  = Join-Path $root "studio\index.html"
$checkedOn = "17 Agustus 2026"

$studios = Get-Content $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Esc($s) {
    if ($null -eq $s) { return "" }
    $s = $s -replace '&', '&amp;'
    $s = $s -replace '<', '&lt;'
    $s = $s -replace '>', '&gt;'
    $s = $s -replace '"', '&quot;'
    return $s
}

function MapsUrl($studio) {
    $q = if ($studio.address) { "$($studio.name), $($studio.address)" } else { "$($studio.name), Malang" }
    return "https://www.google.com/maps/search/?api=1&query=" + [uri]::EscapeDataString($q)
}

$cards = New-Object System.Text.StringBuilder
$verifiedCount = 0

foreach ($s in $studios) {
    if ($s.verified) { $verifiedCount++ }

    $classes = "studio-card"
    if ($s.featured) { $classes += " studio-card--featured" }

    $searchBlob = (Esc "$($s.name) $($s.area) $($s.district) $($s.address)").ToLower()
    $district   = Esc $s.district
    $verAttr    = if ($s.verified) { "true" } else { "false" }

    [void]$cards.AppendLine("      <article class=""$classes"" data-search=""$searchBlob"" data-district=""$district"" data-verified=""$verAttr"">")
    [void]$cards.AppendLine("        <div class=""studio-head"">")

    $badge = if ($s.featured) { " <span class=""studio-badge"">Studio kami</span>" } else { "" }
    [void]$cards.AppendLine("          <h2>$(Esc $s.name)$badge</h2>")

    if ($s.verified) {
        [void]$cards.AppendLine("          <span class=""studio-status studio-status--verified"" title=""Alamat dan kontak dicocokkan dengan sumber publik pada $checkedOn"">Terverifikasi &middot; $checkedOn</span>")
    } else {
        [void]$cards.AppendLine("          <span class=""studio-status studio-status--unverified"">Belum terverifikasi</span>")
    }

    [void]$cards.AppendLine("        </div>")
    [void]$cards.AppendLine("        <dl class=""studio-meta"">")

    if ($s.address) {
        [void]$cards.AppendLine("          <div><dt>Alamat</dt><dd>$(Esc $s.address)</dd></div>")
    }
    if ($s.price) {
        [void]$cards.AppendLine("          <div><dt>Tarif</dt><dd class=""studio-price-val"">$(Esc $s.price)</dd></div>")
    } else {
        [void]$cards.AppendLine("          <div><dt>Tarif</dt><dd class=""studio-unknown"">Belum ada data &mdash; tanyakan langsung</dd></div>")
    }
    if ($s.hours) {
        [void]$cards.AppendLine("          <div><dt>Jam buka</dt><dd>$(Esc $s.hours)</dd></div>")
    }
    if ($s.phone) {
        $tel = $s.phone -replace '[^0-9+]', ''
        [void]$cards.AppendLine("          <div><dt>Telepon</dt><dd><a href=""tel:$tel"">$(Esc $s.phone)</a></dd></div>")
    }
    if ($s.instagram) {
        $handle = "@" + ($s.instagram.TrimEnd('/') -split '/')[-1]
        [void]$cards.AppendLine("          <div><dt>Instagram</dt><dd><a href=""$(Esc $s.instagram)"" target=""_blank"" rel=""noopener"">$(Esc $handle)</a></dd></div>")
    }

    [void]$cards.AppendLine("          <div><dt>Peta</dt><dd><a class=""studio-map"" href=""$(Esc (MapsUrl $s))"" target=""_blank"" rel=""noopener nofollow"">Buka di Google Maps</a></dd></div>")
    [void]$cards.AppendLine("        </dl>")

    if ($s.notes) {
        [void]$cards.AppendLine("        <p class=""studio-note"">$(Esc $s.notes)</p>")
    }

    [void]$cards.AppendLine("      </article>")
    [void]$cards.AppendLine("")
}

$html = Get-Content $pagePath -Raw -Encoding UTF8

$startMark = "      <!-- STUDIO_LIST:START -->"
$endMark   = "      <!-- STUDIO_LIST:END -->"

$startIdx = $html.IndexOf($startMark)
$endIdx   = $html.IndexOf($endMark)
if ($startIdx -lt 0 -or $endIdx -lt 0) {
    throw "Markers STUDIO_LIST:START / STUDIO_LIST:END not found in $pagePath"
}

$before = $html.Substring(0, $startIdx + $startMark.Length)
$after  = $html.Substring($endIdx)
$html   = $before + "`r`n" + $cards.ToString() + $after

# keep the visible counts in sync with the data
$total = $studios.Count
$html = [regex]::Replace($html, '(<span id="countTotal">)\d+(</span>)', "`${1}$total`${2}")
$html = [regex]::Replace($html, '(<span id="countVerified">)\d+(</span>)', "`${1}$verifiedCount`${2}")
$html = [regex]::Replace($html, '("numberOfItems":\s*)\d+', "`${1}$total")

Set-Content -Path $pagePath -Value $html -Encoding UTF8 -NoNewline

Write-Host "Generated $total studio cards ($verifiedCount verified) into studio/index.html"
