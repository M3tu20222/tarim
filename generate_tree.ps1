#Requires -Version 5.1
    param(
        [string]$Path = $PWD.Path,
        [string]$OutputFile = "project_structure.txt",
        [string[]]$Exclude = @('node_modules', '.next', '.git') # Exclude common large/generated folders
    )

    # Ensure the output file is empty before starting
    Clear-Content -Path $OutputFile -ErrorAction SilentlyContinue

    function Format-Tree {
        param(
            [System.IO.FileSystemInfo]$Item,
            [string]$Indent = '',
            [bool]$IsLast = $false,
            [string[]]$ExcludeFolders, # Pass exclude list down
            [string]$TargetFile # Pass output file path
        )

        # Skip if the current item itself is in the exclude list
        if ($Item.Name -in $ExcludeFolders) {
            return
        }

        $marker = if ($IsLast) { '\--' } else { '+--' }
        $line = "$($Indent)$($marker)$($Item.Name)"
        # Append line to file with UTF8 encoding (Add-Content adds newline by default)
        Add-Content -Path $TargetFile -Value $line -Encoding UTF8

        if ($Item.PSIsContainer) {
            # Corrected indent calculation using $() subexpression
            $newIndent = $Indent + $(if ($IsLast) { '   ' } else { '|  ' })
            # Get children, excluding specified folders at this level
            $children = Get-ChildItem -Path $Item.FullName -Force | Where-Object { $_.Name -notin $ExcludeFolders }
            if ($children.Count -eq 0) {
                return
            }
            $lastChild = $children[-1]

            foreach ($child in $children) {
                # Recursive call, passing the exclude list and output file
                Format-Tree -Item $child -Indent $newIndent -IsLast ($child.FullName -eq $lastChild.FullName) -ExcludeFolders $ExcludeFolders -TargetFile $TargetFile
            }
        }
    }

    # Get top-level items excluding specified folders
    $topLevelItems = Get-ChildItem -Path $Path -Force | Where-Object { $_.Name -notin $Exclude }

    # Write root indicator to file (with newline)
    Add-Content -Path $OutputFile -Value "." -Encoding UTF8

    if ($topLevelItems.Count -gt 0) {
        $lastTopLevelItem = $topLevelItems[-1]
        foreach ($item in $topLevelItems) {
            # Start formatting from top level, passing the exclude list and output file
            Format-Tree -Item $item -Indent '' -IsLast ($item.FullName -eq $lastTopLevelItem.FullName) -ExcludeFolders $Exclude -TargetFile $OutputFile
        }
    }
