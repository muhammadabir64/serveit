; ServeIt context menu integration
!macro customInstall
  WriteRegStr HKCR "Directory\shell\ServeIt" "" "Serve with ServeIt"
  WriteRegStr HKCR "Directory\shell\ServeIt" "Icon" "$INSTDIR\resources\icon.ico"
  WriteRegStr HKCR "Directory\shell\ServeIt\command" "" '"$INSTDIR\ServeIt.exe" --serve "%1"'

  WriteRegStr HKCR "Directory\Background\shell\ServeIt" "" "Serve with ServeIt"
  WriteRegStr HKCR "Directory\Background\shell\ServeIt" "Icon" "$INSTDIR\resources\icon.ico"
  WriteRegStr HKCR "Directory\Background\shell\ServeIt\command" "" '"$INSTDIR\ServeIt.exe" --serve "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCR "Directory\shell\ServeIt"
  DeleteRegKey HKCR "Directory\Background\shell\ServeIt"
!macroend
