/**
	KISSC Compression Library
	Version 1.1
	By: Jacob Christian Munch-Andersen, Specialisterne Denmark
	
	Permission is hereby given for anyone to use and modify this library for any purpose.
	This library may be freely distrubuted in modified form.
	This library may be freely distributed in unmodified form, provided that the distributer require no form of payment.
	Alternately, this library may be distributed in unmodified form as part of another product, provided that the inclusion is not advertised as a main feature.
	Modified versions of this library may not be called KISSC.
**/
var kissc={
	compress:function(str,density){
		var buffer=window.Int32Array||Array
		var index=new buffer(1024*1024*4)
		var a,b
		var commandlist=new buffer(1000002)
		var lastcommand
		var rangemap=new buffer(524288)
		var rangemapfill
		var rangemapmiss
		var command
		var commandindex=new buffer(327683)
		var nextinsert
		var movernd
		var base64=[]
		for(a=65;a<91;a++){
			base64.push(a)
		}
		for(a=97;a<123;a++){
			base64.push(a)
		}
		for(a=48;a<58;a++){
			base64.push(a)
		}
		base64.push(45)
		base64.push(95)
		var result=[(density==15?"\u0100":"A")]
		var resetpoint
		var movinghash=0
		var hashpos
		var length
		var found
		var tokenlist=[]
		var tokenlength=0
		var charbuffer=[]
		var charbufferlength=0
		var alternateindex=new buffer(1024*1024)
		function initialize(){
			var b
			for(b=0;b<1024*1024*4;b++){
				index[b]=-1
			}
			resetpoint=a
			commandlist[0]=65536
			commandlist[96]=65537
			commandlist[97]=65538
			lastcommand=97
			for(b=1;b<96;b++){
				commandlist[b]=31+b
			}
			for(b=0;b<327683;b++){
				commandindex[b]=-1
			}
			for(b=0;b<98;b++){
				commandindex[commandlist[b]]=b
			}
			for(b=0;b<524288;b++){
				rangemap[b]=-1
			}
			nextinsert=0
			movernd=0
			rangemapfill=0
			rangemapmiss=0
			for(b=0;b<1024*1024;b++){
				alternateindex[b]=-1
			}
		}
		function findalternate(pos,len,newending,newpos){
			if(len>250000){
				return 0
			}
			var combi1=str.charCodeAt(newending)+(str.charCodeAt(newending+1)<<16)
			var combi2=str.charCodeAt(newending+2)+(str.charCodeAt(newending+3)<<16)
			var hash=((len+99*pos+919*str.charCodeAt(newending)+719*str.charCodeAt(newending+1)+809*str.charCodeAt(newending+2)+601*str.charCodeAt(newending+3))&0x3ffff)<<2
			if(alternateindex[hash]===-1){
				alternateindex[hash]=pos
				alternateindex[hash+1]=combi1
				alternateindex[hash+2]=combi2
				alternateindex[hash+3]=newpos
			}
			else{
				if(alternateindex[hash]===pos && alternateindex[hash+1]===combi1 && alternateindex[hash+2]===combi2){
					return alternateindex[hash+3]
				}
				else{
					return 0
				}
			}
		}
		function inithash(){
			var b
			movinghash=0
			for(b=0;b<4;b++){
				movinghash=(movinghash*139+str.charCodeAt(a+b))&0x3fffff
			}
		}
		function findrange(hashpos,length){
			var rangehash=(hashpos+1099*length)&0x3ffff
			var increment=0
			while(true){
				found=(rangemap[rangehash*2]===hashpos && rangemap[rangehash*2+1]===length)
				if(found){
					return rangehash
				}
				else if(rangemap[rangehash*2]===-1){
					rangemap[rangehash*2]=hashpos
					rangemap[rangehash*2+1]=length
					rangemapfill++
					return rangehash
				}
				else{
					rangemapmiss++
					increment++
					rangehash=(rangehash+increment)&0x3ffff
				}
			}
		}
		function insertnew(obj){
			lastcommand++
			commandlist[lastcommand]=obj
			updatecommandindex(lastcommand)
		}
		function updatecommandindex(index){
			commandindex[commandlist[index]]=index
		}
		function pushnumber(n){
			while(n>=4){
				pushtoken((n&3)+4)
				n=(n>>2)-1
			}
			pushtoken(n)
		}
		function pushcommand(n){
			if(n<64){
				pushnumber(n)
			}
			else{
				pushnumber(lastcommand-n+64)
			}
		}
		function promote(index){
			var moveto
			var mem
			if(index<64){
				movernd=(movernd+331804471)&0x3fffffff
				moveto=Math.max(0,Math.min(index-1,(index>>1)+(movernd>>28)))
				mem=commandlist[index]
			}
			else{
				nextinsert=(nextinsert+13)&0x1f
				moveto=nextinsert+32
				if(index!==lastcommand){
					lastcommand++
				}
				mem=commandlist[index]
				index=lastcommand
			}
			commandlist[index]=commandlist[moveto]
			commandlist[moveto]=mem
			updatecommandindex(index)
			updatecommandindex(moveto)
		}
		function pushtoken6(token){
			if(tokenlength===0){
				tokenlist[0]=token
				tokenlength=1
			}
			else{
				charbuffer[charbufferlength]=base64[token*8+tokenlist[0]]
				tokenlength=0
				charbufferlength++
				if(charbufferlength>1023){
					result.push(String.fromCharCode.apply(null,charbuffer))
					charbufferlength=0
				}
			}
		}
		function pushtoken15(token){
			if(tokenlength<4){
				tokenlist[tokenlength]=token
				tokenlength++
			}
			else{
				charbuffer[charbufferlength]=256+tokenlist[0]+tokenlist[1]*8+tokenlist[2]*64+tokenlist[3]*512+token*4096
				tokenlength=0
				charbufferlength++
				if(charbufferlength>1023){
					result.push(String.fromCharCode.apply(null,charbuffer))
					charbufferlength=0
				}
			}
		}
		var pushtoken=(density==15?pushtoken15:pushtoken6)
		var alternatepos
		a=0
		initialize()
		inithash()
		while(a<str.length){
			hashpos=index[movinghash]
			if(hashpos!==-1 && str[hashpos]===str[a] && str[hashpos+1]===str[a+1] && str[hashpos+2]===str[a+2] && str[hashpos+3]===str[a+3]){
				length=4
				do{
					while(str[a+length]===str[hashpos+length] && resetpoint+5000000-a>length){
						length++
					}
					alternatepos=findalternate(hashpos,length,a+length,a)
					if(alternatepos){
						hashpos=alternatepos
						length+=4
					}
				}while(alternatepos)
				var commandfull=findrange(hashpos,length)
				if(found){
					command=commandindex[commandfull+65539]
					pushcommand(command)
					promote(command)
				}
				else{
					var commandhalf=findrange(hashpos,0)
					if(found){
						command=commandindex[commandhalf+65539]
						pushcommand(command)
						promote(command)
						pushnumber(length-4)
						insertnew(commandfull+65539)
					}
					else{
						command=commandindex[65536]
						pushcommand(command)
						pushnumber(hashpos-resetpoint)
						pushnumber(length-4)
						promote(command)
						insertnew(commandhalf+65539)
						insertnew(commandfull+65539)
					}
				}
				a+=length-3
				inithash()
				for(b=0;b<3;b++){
					if(index[movinghash]===-1){
						index[movinghash]=a
					}
					a++
					movinghash=(movinghash*139+str.charCodeAt(a+3)-7985*str.charCodeAt(a-1))&0x3fffff
				}
			}
			else{
				if(hashpos===-1){
					index[movinghash]=a
				}
				var charcode=str.charCodeAt(a)
				command=commandindex[charcode]
				if(command!==-1){
					pushcommand(command)
					promote(command)
				}
				else{
					command=commandindex[65538]
					pushcommand(command)
					pushnumber(charcode)
					promote(command)
					insertnew(charcode)
				}
				a++
				movinghash=(movinghash*139+str.charCodeAt(a+3)-7985*str.charCodeAt(a-1))&0x3fffff
			}
			if(resetpoint+5000000<=a || lastcommand>=1000000 || rangemapmiss>10000000 || rangemapfill>230000){
				pushcommand(commandindex[65537])
				initialize()
			}
		}
		while(tokenlength){
			pushtoken(7)
		}
		result.push(String.fromCharCode.apply(String,charbuffer.slice(0,charbufferlength)))
		return result.join("")
	}
	,decompress:function(str,maxlength){
		maxlength=maxlength||Infinity
		var a,b
		var base64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
		var unbase641=[]
		var unbase642=[]
		for(a=0;a<64;a++){
			unbase641[base64.charCodeAt(a)]=a&7
			unbase642[base64.charCodeAt(a)]=(a>>3)&7
		}
		var strpos=1
		var numbers=[]
		var numberslength=0
		var procnumber=0
		var procshift=0
		function pushnumber(n){
			numbers[numberslength]=n
			numberslength++
		}
		function morenumbers6(){
			var stop=Math.min(str.length,strpos+50000)
			for(;strpos<stop;strpos++){
				var inchar=str.charCodeAt(strpos)
				var lower=unbase641[inchar]
				var upper=unbase642[inchar]
				if(typeof lower !== "number"){
					return false
				}
				if(lower>3){
					if(upper>3){
						procnumber+=(lower+(upper<<2))<<procshift
						procshift+=4
					}
					else{
						pushnumber(procnumber+((lower+(upper<<2))<<procshift))
						procnumber=0
						procshift=0
					}
				}
				else{
					pushnumber(procnumber+(lower<<procshift))
					if(upper>3){
						procnumber=upper
						procshift=2
					}
					else{
						pushnumber(upper)
						procnumber=0
						procshift=0
					}
				}
			}
		}
		function morenumbers15(){
			var stop=Math.min(str.length,strpos+20000)
			for(;strpos<stop;strpos++){
				var inchar=str.charCodeAt(strpos)-256
				if(!(inchar>=0 && inchar<32768)){
					return false
				}
				for(var a=0;a<5;a++){
					var token=inchar&7
					if(token>3){
						procnumber+=token<<procshift
						procshift+=2
					}
					else{
						pushnumber(procnumber+(token<<procshift))
						procnumber=0
						procshift=0
					}
					inchar=inchar>>3
				}
			}
		}
		var morenumbers
		if(str[0]==="A"){
			morenumbers=morenumbers6
		}
		else if(str[0]==="\u0100"){
			morenumbers=morenumbers15
		}
		else{
			return false
		}
		var commandlist=[]
		var lastcommand
		var rangelist=[]
		var rangelistlength
		var nextinsert
		var movernd
		function resetstate(){
			var a
			commandlist[0]=65536
			commandlist[96]=65537
			commandlist[97]=65538
			lastcommand=97
			for(a=1;a<96;a++){
				commandlist[a]=31+a
			}
			nextinsert=0
			movernd=0
			rangelistlength=0
			originalpos=0
		}
		resetstate()
		function emptyoriginal(){
			var a
			for(a=0;a<originalpos;a+=1024){
				result.push(String.fromCharCode.apply(String,original.slice(a,Math.min(a+1024,originalpos))))
			}
		}
		function insertnew(obj){
			lastcommand++
			commandlist[lastcommand]=obj
		}
		function pushoriginal(chr){
			original[originalpos]=chr
			originalpos++
		}
		function newrange(pos,len){
			insertnew(65539+rangelistlength)
			rangelist[rangelistlength]=pos
			rangelist[rangelistlength+1]=len
			rangelistlength+=2
		}
		function promote(index){
			var moveto
			var mem
			if(index<64){
				movernd=(movernd+331804471)&0x3fffffff
				moveto=Math.max(0,Math.min(index-1,(index>>1)+(movernd>>28)))
				mem=commandlist[index]
				commandlist[index]=commandlist[moveto]
			}
			else{
				nextinsert=(nextinsert+13)&0x1f
				moveto=nextinsert+32
				if(index!==lastcommand){
					lastcommand++
				}
				mem=commandlist[index]
				commandlist[lastcommand]=commandlist[moveto]
			}
			commandlist[moveto]=mem
		}
		var original=[]
		var originalpos
		var result=[]
		var rangelength
		var beginfrom
		if(morenumbers()===false){
			return false
		}
		for(a=0;a<numberslength;a++){
			if(a+5>numberslength){
				for(b=a;b<numberslength;b++){
					numbers[b-a]=numbers[b]
				}
				numberslength=b-a
				a=0
				if(morenumbers()===false){
					return false
				}
			}
			var commandno=numbers[a]
			if(commandno>=64){
				commandno=lastcommand-commandno+64
			}
			var command=commandlist[commandno]
			if(typeof command !== "number"){
				return false
			}
			promote(commandno)
			if(command>65538){
				rangelength=rangelist[command-65538]
				beginfrom=rangelist[command-65539]
				if(rangelength===0){
					a++
					rangelength=numbers[a]+4
					newrange(beginfrom,rangelength)
				}
				if(!(originalpos+rangelength<5000010)){
					return false
				}
				for(b=0;b<rangelength;b++){
					pushoriginal(original[beginfrom+b])
				}
			}
			else if(command===65538){
				a++
				if(!(numbers[a]<65536)){
					return false
				}
				insertnew(numbers[a])
				pushoriginal(numbers[a])
			}
			else if(command===65536){
				a++
				beginfrom=numbers[a]
				if(!(beginfrom<originalpos)){
					return false
				}
				newrange(beginfrom,0)
				a++
				rangelength=numbers[a]+4
				if(!(originalpos+rangelength<5000010)){
					return false
				}
				for(b=0;b<rangelength;b++){
					pushoriginal(original[beginfrom+b])
				}
				newrange(beginfrom,rangelength)
			}
			else if(command===65537){
				maxlength-=originalpos
				if(maxlength<0){
					return false
				}
				emptyoriginal()
				resetstate()
			}
			else if(command<65536){
				pushoriginal(command)
			}
			else{
				return false
			}
		}
		if(maxlength-originalpos<0){
			return false
		}
		emptyoriginal()
		return result.join("")
	}
}