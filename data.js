/* Data jaringan. Nama stasiun = referensi nyata (lintas utara Jawa). Kilometer, jumlah jalur/peron, dan jadwal = SIMULASI (perkiraan, bukan data resmi KAI). */
const ST=[["Jakarta Gambir","GMR",0,3],["Jakarta Pasar Senen","PSE",3,3],["Jatinegara","JNG",9,2],["Bekasi","BKS",24,2],["Cikampek","CKP",83,3],["Haurgeulis","HRG",160,2],["Jatibarang","JTB",205,2],["Cirebon","CN",258,3],["Brebes","BBS",306,2],["Tegal","TG",320,2],["Pekalongan","PK",383,3],["Semarang Tawang","SMT",466,3],["Cepu","CU",590,2],["Bojonegoro","BJ",630,2],["Babat","BBT",670,2],["Surabaya Pasarturi","SBI",725,3]]
.map((s,i)=>({i,name:s[0],code:s[1],km:s[2],plat:s[3],src:"Nama: referensi nyata · km/jalur: simulasi"}));
/* Nama layanan nyata (KAI); nomor, headway, kecepatan, dan perhentian = ILUSTRATIF. a/b = indeks stasiun asal/tujuan. h = headway menit. */
const SVC=[
{n:"Argo Bromo Anggrek",c:"Eksekutif",p:5,v:120,a:0,b:15,stop:[7,11],no:1,h:190},
{n:"Argo Muria",c:"Eksekutif",p:5,v:120,a:0,b:11,stop:[7,10],no:7,h:220},
{n:"Argo Cheribon",c:"Eksekutif",p:4,v:110,a:0,b:7,stop:[4],no:15,h:150},
{n:"Sembrani",c:"Eksekutif",p:4,v:110,a:0,b:15,stop:[2,7,11],no:21,h:300},
{n:"Gumarang",c:"Bisnis/Ekonomi",p:3,v:100,a:1,b:15,stop:[4,7,11,13],no:25,h:300},
{n:"Kertajaya",c:"Ekonomi",p:3,v:90,a:1,b:15,stop:[2,4,6,7,9,10,11,12,13,14],no:29,h:330},
{n:"Tawang Jaya",c:"Ekonomi",p:3,v:95,a:1,b:11,stop:[4,7,9,10],no:33,h:260},
{n:"Kaligung",c:"Regional",p:2,v:85,a:9,b:11,stop:[10],no:37,h:110},
{n:"KA BBM Pertamina",c:"Barang",p:1,v:70,a:7,b:15,stop:[],no:5001,h:150},
{n:"KA Peti Kemas",c:"Barang",p:1,v:70,a:4,b:15,stop:[],no:5011,h:180}];
