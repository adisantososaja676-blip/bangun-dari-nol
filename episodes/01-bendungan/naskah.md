# Ep. 01: Bendungan

**Judul/hook:** Nahan sungai cuma modal ranting, bisa nggak?
**Durasi target:** ±80 detik
**Sumber teks kebenaran:** [`script.json`](script.json). File ini versi baca + catatan riset.

## Naskah untuk TTS (salin apa adanya)

> Nahan sungai cuma modal ranting, bisa nggak?
> Ini Pak Bero, berang-berang insinyur.
> Pak Bero numpuk ranting dari tepi ke tepi.
> Masalahnya, ranting itu banyak celahnya. Airnya rembes ke mana-mana.
> Jadi dia tambal pakai lumpur. Sekarang kedap, airnya mulai naik.
> Tapi makin dalam airnya, makin besar tekanannya. Bagian paling bawah didorong paling keras, sampai akhirnya jebol.
> Solusinya, Pak Bero bikin urugan tanah: bawahnya lebar, atasnya sempit. Ini namanya tubuh bendungan. Bagian bawah paling tebal, pas buat nahan tekanan paling besar.
> Masalahnya, pas hujan deras, airnya naik sampai meluap lewat puncak. Tanahnya tergerus, bendungannya runtuh. Ini namanya overtopping.
> Tahun 2009, tanggul tanah Situ Gintung jebol, dan sekitar seratus orang meninggal. Salah satu kajian menyebut saluran buang airnya kurang besar.
> Jadi Pak Bero bikin jalur khusus buat buang air berlebih, dilapisi beton biar nggak tergerus. Ini namanya pelimpah.
> Masalahnya lagi, air bisa merembes diam-diam lewat dalam tanah, bawa butiran tanah sedikit demi sedikit, sampai jadi lorong. Ini namanya piping.
> Solusinya, di tengah dipasang inti kedap dari tanah liat, plus filter pasir buat nahan butiran tanah.
> Sekarang hujan boleh deras, air lewat pelimpah, rembesan ketahan inti. Bendungannya berdiri.
> Oh iya, bendungan berang-berang terbesar di dunia panjangnya hampir 800 meter, sampai kelihatan dari satelit.
> Habis ini, Pak Bero bangun apa lagi ya?

**Instruksi TTS:** suara santai, cepat, ramah (gaya "kakak cerita"). Jeda pendek di koma, jeda sedikit lebih panjang di titik. Bagian Situ Gintung dibaca lebih pelan dan serius.

**Ekspor:** satu file audio utuh (`.mp3`/`.wav`). Kalau TTS-nya bisa ekspor timestamp per kata (mis. ElevenLabs "with timestamps"), sertakan juga JSON-nya.

## Rantai evolusi solusi

| Tahap | Solusi | Masalah | Istilah |
|---|---|---|---|
| 1 | Tumpukan ranting | Banyak celah, air rembes | celah |
| 2 | Ditambal lumpur | Tekanan air terbesar di bawah → jebol | tekanan |
| 3 | Urugan tanah trapesium | Hujan deras → air melimpas puncak → tergerus | tubuh bendungan, overtopping |
| 4 | Pelimpah beton | Rembesan di dalam tanah membawa butiran | pelimpah, piping |
| 5 | Inti kedap tanah liat + filter pasir | Berdiri | inti kedap, filter |

## Cek fakta

| Klaim di naskah | Status | Sumber |
|---|---|---|
| Tekanan air bertambah dengan kedalaman (tekanan hidrostatik) | Fisika dasar | n/a |
| Overtopping dan piping (erosi internal) adalah dua penyebab utama jebolnya bendungan urugan tanah | Ya. Angka per dataset beda-beda (masing-masing kira-kira ⅓ sampai ½ kasus), makanya naskah tidak menyebut persen | [USBR Best Practices D-3](https://www.usbr.gov/damsafety/Risk/BestPractices/Chapters/D3-FloodOvertoppingFailureOfDamsAndLevees.pdf), [NAP: Safety of Existing Dams](https://www.nap.edu/read/289/chapter/3) |
| Situ Gintung, tanggul tanah, jebol 2009 | 27 Maret 2009, bendungan urugan tanah homogen dari 1932 | [Wikipedia](https://en.wikipedia.org/wiki/Situ_Gintung), [Tirto](https://tirto.id/kelalaian-yang-membuat-situ-gintung-jebol-cGJm) |
| "Sekitar seratus orang meninggal" | Laporan bervariasi 94–100 jiwa. "Sekitar seratus" aman | [Tirto](https://tirto.id/kelalaian-yang-membuat-situ-gintung-jebol-cGJm), [Jakarta Post](https://www.thejakartapost.com/news/2009/03/30/situ-gintung-disaster-death-toll-reaches-97-blame-game-starts) |
| "Salah satu kajian menyebut saluran buang airnya kurang besar" | Jurnal Gunadarma: kapasitas pelimpah tidak cukup → overtopping. Penyebab resmi masih diperdebatkan (pemerintah: hujan + erosi), makanya pakai "salah satu kajian" | [ejournal Gunadarma](https://ejournal.gunadarma.ac.id/index.php/dekons/article/download/846/756) |
| Bendungan berang-berang terbesar hampir 800 m, kelihatan dari satelit | Parks Canada: hampir 800 m, Wood Buffalo National Park. Ditemukan 2007 lewat citra satelit oleh Jean Thie. Media lain menulis ~850 m | [Parks Canada](https://parks.canada.ca/pn-np/nt/woodbuffalo/nature/beaver_gallery), [Phys.org](https://phys.org/news/2010-05-world-biggest-beaver-northern-canada.html) |

⚠️ **Sensitif:** Situ Gintung adalah tragedi nyata. Visualnya tenang (tanpa efek dramatis/lucu), dan Pak Bero tidak tampil konyol di bagian ini.

## Caption & hashtag (draft)

> Kenapa bendungan bentuknya trapesium, dan kenapa harus ada pelimpah? Pak Bero belajar dengan cara yang keras 🦫
>
> #bendungan #tekniksipil #edukasi #faktaunik #belajardirumah #sains
