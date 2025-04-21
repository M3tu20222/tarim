#Requires -Version 5.1
param(
    [string]$Path = $PWD.Path,
    [string]$OutputFile = "project_structure.txt",
    [string[]]$Exclude = @('node_modules', '.next', '.git') # Exclude common large/generated folders
)

# Function to recursively build the tree structure lines
function Format-Tree {
    param(
        [System.IO.FileSystemInfo]$Item,
        [string]$Indent = '',
        [bool]$IsLast = $false,
        [string[]]$ExcludeFolders # Pass exclude list down
    )

    # Skip if the current item itself is in the exclude list
    if ($Item.Name -in $ExcludeFolders) {
        return @() # Return empty array if excluded
    }

    $marker = if ($IsLast) { '\--' } else { '+--' }
    $line = "$($Indent)$($marker)$($Item.Name)"
    $outputLines = @($line) # Start with the current item's line

    if ($Item.PSIsContainer) {
        # Corrected indent calculation using $() subexpression
        $newIndent = $Indent + $(if ($IsLast) { '   ' } else { '|  ' })
        # Get children, excluding specified folders at this level
        $children = Get-ChildItem -Path $Item.FullName -Force | Where-Object { $_.Name -notin $ExcludeFolders }
        if ($children.Count -gt 0) {
            $lastChild = $children[-1]
            foreach ($child in $children) {
                # Recursive call, passing the exclude list and collecting lines
                $outputLines += Format-Tree -Item $child -Indent $newIndent -IsLast ($child.FullName -eq $lastChild.FullName) -ExcludeFolders $ExcludeFolders
            }
        }
    }
    return $outputLines # Return all collected lines for this branch
}

# --- Main Script ---

# Get top-level items excluding specified folders
$topLevelItems = Get-ChildItem -Path $Path -Force | Where-Object { $_.Name -notin $Exclude }

# Initialize the list of lines with the root indicator
$allLines = @(".")

# Process top-level items
if ($topLevelItems.Count -gt 0) {
    $lastTopLevelItem = $topLevelItems[-1]
    foreach ($item in $topLevelItems) {
        # Start formatting from top level, passing the exclude list and collecting lines
        $allLines += Format-Tree -Item $item -Indent '' -IsLast ($item.FullName -eq $lastTopLevelItem.FullName) -ExcludeFolders $Exclude
    }
}

# Write all collected lines to the output file at once with UTF8 encoding
try {
    $allLines | Out-File -FilePath $OutputFile -Encoding UTF8 -Force
    Write-Host "Project structure successfully written to $OutputFile"
} catch {
    Write-Error "Failed to write to $OutputFile. Error: $($_.Exception.Message)"
}

# Example command to run:
# powershell -ExecutionPolicy Bypass -File .\generate_tree.ps1 -OutputFile project_structure_new.txt
