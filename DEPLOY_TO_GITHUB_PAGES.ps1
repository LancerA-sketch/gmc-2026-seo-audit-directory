<#
.SYNOPSIS
  1-Click Deployment Script for SchemaGuard 2026 Programmatic SEO Audit Directory (315+ Brand Pages)
  Pushes index.html, brands/*.html, assets/*, sitemap.xml, and robots.txt to GitHub Pages.
.PARAMETER RepoName
  Target GitHub repository name (default: "gmc-2026-seo-audit-directory")
.PARAMETER RemoteUrl
  Optional explicit Git remote URL (e.g. "https://github.com/username/gmc-2026-seo-audit-directory.git")
.PARAMETER Branch
  Target branch for GitHub Pages deployment (default: "gh-pages")
#>
param(
  [string]$RepoName = "gmc-2026-seo-audit-directory",
  [string]$RemoteUrl = "",
  [string]$Branch = "gh-pages"
)

$ErrorActionPreference = "Stop"
$SiteDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SiteDir

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " [SCHEMAGUARD 2026] 1-CLICK GITHUB PAGES SEO DIRECTORY DEPLOYMENT " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Verify required directory artifacts exist
$IndexFile = Join-Path $SiteDir "index.html"
$PrivacyFile = Join-Path $SiteDir "privacy-policy.html"
$SitemapFile = Join-Path $SiteDir "sitemap.xml"
$RobotsFile = Join-Path $SiteDir "robots.txt"
$BrandsDir = Join-Path $SiteDir "brands"

if (-not (Test-Path $IndexFile)) { throw "Missing index.html in $SiteDir" }
if (-not (Test-Path $PrivacyFile)) { throw "Missing privacy-policy.html in $SiteDir" }
if (-not (Test-Path $SitemapFile)) { throw "Missing sitemap.xml in $SiteDir" }
if (-not (Test-Path $RobotsFile)) { throw "Missing robots.txt in $SiteDir" }
if (-not (Test-Path $BrandsDir)) { throw "Missing brands/ directory in $SiteDir" }

$BrandCount = (Get-ChildItem -Path $BrandsDir -Filter "*.html").Count
Write-Host "[OK] Verified Static SEO Build: index.html + privacy-policy.html + $BrandCount Brand Pages + sitemap.xml + robots.txt" -ForegroundColor Green

# 2. Ensure .nojekyll exists so GitHub Pages serves all static files without Jekyll processing
$NoJekyllFile = Join-Path $SiteDir ".nojekyll"
if (-not (Test-Path $NoJekyllFile)) {
  Set-Content -Path $NoJekyllFile -Value "" -Encoding UTF8
  Write-Host "[OK] Created .nojekyll for zero-overhead GitHub Pages static serving" -ForegroundColor Green
}

# 3. Initialize isolated Git repository in 10_public_seo_audit_directory if not initialized
if (-not (Test-Path (Join-Path $SiteDir ".git"))) {
  Write-Host "-> Initializing Git repository in $SiteDir..." -ForegroundColor Yellow
  git init | Out-Null
}

git checkout -B $Branch | Out-Null
git add index.html privacy-policy.html sitemap.xml robots.txt .nojekyll assets/ brands/
$Status = git status --porcelain
if ($Status) {
  $CommitMsg = "feat(seo): sync SchemaGuard Pro v3.0 unified istvro funnel & CWS privacy-policy.html ($(Get-Date -Format 'yyyy-MM-dd'))"
  git commit -m $CommitMsg | Out-Null
  Write-Host "[OK] Committed static Programmatic SEO v3.0 build + privacy-policy.html to branch '$Branch'" -ForegroundColor Green
} else {
  Write-Host "[OK] Working tree is already clean and committed on branch '$Branch'" -ForegroundColor Green
}

# 4. Configure remote & push via GitHub CLI (gh) or Git Remote URL
if ($RemoteUrl) {
  $ExistingRemotes = git remote
  if ($ExistingRemotes -contains "origin") {
    git remote set-url origin $RemoteUrl
  } else {
    git remote add origin $RemoteUrl
  }
  Write-Host "-> Pushing 315+ SEO pages + privacy-policy.html to $RemoteUrl ($Branch)..." -ForegroundColor Yellow
  git push -u origin $Branch
  Write-Host "[OK] Successfully pushed to $RemoteUrl ($Branch)!" -ForegroundColor Green
} elseif (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "-> Detected GitHub CLI (gh). Checking authentication..." -ForegroundColor Yellow
  $GhUser = (gh api user --jq ".login" 2>$null)
  if ($GhUser) {
    $ExistingRemotes = git remote
    if (-not ($ExistingRemotes -contains "origin")) {
      Write-Host "-> Creating public GitHub repository '$GhUser/$RepoName'..." -ForegroundColor Yellow
      gh repo create $RepoName --public --source=. --remote=origin --push
    } else {
      git push -u origin $Branch --force
    }
    Write-Host "-> Enabling GitHub Pages on branch '$Branch'..." -ForegroundColor Yellow
    gh api -X POST "repos/$GhUser/$RepoName/pages" -f "source[branch]=$Branch" -f "source[path]=/" 2>$null | Out-Null
    $PublicUrl = "https://$GhUser.github.io/$RepoName/"
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host " [OK] LIVE PUBLIC SEO DIRECTORY URL: $PublicUrl" -ForegroundColor Green
    Write-Host " [OK] SITEMAP URL FOR GOOGLE SEARCH CONSOLE: $($PublicUrl)sitemap.xml" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
  } else {
    Write-Host "[WARN] GitHub CLI not logged in. Run 'gh auth login' or pass -RemoteUrl <git_url> and re-run." -ForegroundColor Yellow
  }
} else {
  Write-Host "[INFO] Local Git branch '$Branch' is staged and committed with all $BrandCount brand pages." -ForegroundColor Cyan
  Write-Host "  To push to GitHub Pages, run:" -ForegroundColor Cyan
  Write-Host "  .\DEPLOY_TO_GITHUB_PAGES.ps1 -RemoteUrl 'https://github.com/<your-username>/$RepoName.git'" -ForegroundColor White
}
