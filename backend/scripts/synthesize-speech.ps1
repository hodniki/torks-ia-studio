param([Parameter(Mandatory=$true)][string]$InputFile,[Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
$text = [System.IO.File]::ReadAllText($InputFile, [System.Text.Encoding]::UTF8)

try {
  Add-Type -AssemblyName System.Speech
  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $voices = @($speaker.GetInstalledVoices())
  $portuguese = $voices | Where-Object { $_.VoiceInfo.Culture.Name -like 'pt-*' } | Select-Object -First 1
  if ($portuguese) { $speaker.SelectVoice($portuguese.VoiceInfo.Name) }
  $speaker.Rate = 1
  $speaker.SetOutputToWaveFile($OutputFile)
  $speaker.Speak($text)
  $speaker.Dispose()
} catch {
  if ($speaker) { $speaker.Dispose() }
  $voice = New-Object -ComObject SAPI.SpVoice
  $available = $voice.GetVoices()
  for ($index = 0; $index -lt $available.Count; $index++) {
    $candidate = $available.Item($index)
    if ($candidate.GetDescription() -match 'Portugu|Brazil|Maria') { $voice.Voice = $candidate; break }
  }
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Format.Type = 22
  $stream.Open($OutputFile, 3, $false)
  $voice.AudioOutputStream = $stream
  [void]$voice.Speak($text)
  $stream.Close()
}
