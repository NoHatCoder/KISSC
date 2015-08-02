/**
	KISSC Compression Library
	By: Jacob Christian Munch-Andersen
	
	Permission is hereby given for anyone to use and modify this library for any purpose.
	This library may be freely distrubuted in modified form.
	This library may be freely distributed in unmodified form for free.
	This library may be distributed in unmodified form as part of a commercial software product, provided that the inclusion is not advertised as a main feature.
	Modified versions of this library may not be called KISSC.
**/
var kissc={
	compress:function(str,density){
		var index
		var a,b
		var indexstr
		var step2=[]
		var commandlist
		var lastcommand
		var command
		var singleindex
		var commandindex
		var nextinsert
		var movernd
		var base64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
		var result=[(density==15?"\u0100":"A")]
		var resetpoint
		function initialize(point){
			var a
			index=[]
			for(a=0;a<1024*1024*4;a++){
				index[a]=-1
			}
			resetpoint=point
			commandlist=["range"]
			commandlist[96]="reset"
			commandlist[97]="literal"
			lastcommand=97
			singleindex=new Array(1024*64)
			commandindex={"range":0,"reset":96,"literal":97}
			for(a=1;a<96;a++){
				singleindex[31+a]=a
				commandlist[a]=31+a
			}
			nextinsert=0
			movernd=0
		}
		function getindex(pos){
			var hashvalue=hash(pos)
			if(!isNaN(hashvalue)){
				var oldpos=index[hashvalue]
				if(oldpos!==-1){
					if(str.substr(pos,4)===str.substr(oldpos,4)){
						return oldpos
					}
				}
				else{
					index[hashvalue]=pos
				}
			}
			return undefined
		}
		function hash(pos){
			return (str.charCodeAt(pos)+str.charCodeAt(pos+1)*154331+str.charCodeAt(pos+2)*796833+str.charCodeAt(pos+3)*3790575)&0x3fffff
		}
		function pushnumber(n){
			while(n>=4){
				step2.push((n&3)+4)
				n=(n>>2)-1
			}
			step2.push(n)
		}
		function pushcommand(n){
			if(n<64){
				pushnumber(n)
			}
			else{
				pushnumber(lastcommand-n+64)
			}
		}
		function updatecommandindex(index){
			var command=commandlist[index]
			if(typeof command==="number"){
				singleindex[command]=index
			}
			else{
				commandindex[command.toString()]=index
			}
		}
		function insertnew(obj){
			lastcommand++
			commandlist[lastcommand]=obj
			updatecommandindex(lastcommand)
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
		function string6bit(finaldata){
			if((step2.length&1) && finaldata){
				step2.push(7)
			}
			var buffer=[]
			var length=step2.length-(step2.length&1)
			var a
			for(a=0;a<length;a+=2){
				buffer.push(base64[step2[a]+step2[a+1]*8])
			}
			result.push(buffer.join(""))
			step2=step2.slice(length)
		}
		function string15bit(finaldata){
			while(finaldata && (step2.length%5)){
				step2.push(7)
			}
			var buffer=[]
			var length=step2.length-(step2.length%5)
			var a
			for(a=0;a<length;a+=5){
				buffer.push(String.fromCharCode(256+step2[a]+step2[a+1]*8+step2[a+2]*64+step2[a+3]*512+step2[a+4]*4096))
			}
			result.push(buffer.join(""))
			step2=step2.slice(length)
		}
		var emptystep2=(density==15?string15bit:string6bit)
		initialize(0)
		a=0
		while(a<str.length){
			var indexpos=getindex(a)
			if(indexpos!==undefined){
				var length=4
				while(str[a+length]===str[indexpos+length] && resetpoint+5000000>a+length){
					length++
				}
				command=commandindex[indexpos+","+length]
				if(command!==undefined){
					pushcommand(command)
					promote(command)
				}
				else{
					command=commandindex[indexpos]
					if(command!==undefined){
						pushcommand(command)
						promote(command)
						pushnumber(length-4)
						insertnew([indexpos,length])
					}
					else{
						command=commandindex["range"]
						pushcommand(command)
						pushnumber(indexpos-resetpoint)
						pushnumber(length-4)
						promote(command)
						insertnew([indexpos])
						insertnew([indexpos,length])
					}
				}
				a+=length
				for(b=-3;b<0;b++){
					getindex(a+b)
				}
			}
			else{
				var charcode=str.charCodeAt(a)
				command=singleindex[charcode]
				if(command!==undefined){
					pushcommand(command)
					promote(command)
				}
				else{
					command=commandindex["literal"]
					pushcommand(command)
					pushnumber(charcode)
					promote(command)
					insertnew(charcode)
				}
				a++
			}
			if(step2.length>=100000){
				emptystep2()
			}
			if(resetpoint+5000000<=a || lastcommand>=1000000){
				pushcommand(commandindex["reset"])
				initialize(a)
			}
		}
		emptystep2(true)
		return result.join("")
	}
	,decompress:function(str,maxlength){
		maxlength=maxlength||Infinity
		var a,b
		var step2=[]
		var base64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
		var unbase64={}
		for(a=0;a<64;a++){
			unbase64[base64[a]]=a
		}
		var moreinput=true
		var strpos=1
		var numbers=[]
		var decode
		if(str[0]==="A"){
			decode=decode6bit
		}
		else if(str[0]==="\u0100"){
			decode=decode15bit
		}
		else{
			return false
		}
		function decode6bit(){
			var a
			var stop=Math.min(str.length,strpos+50000)
			for(a=strpos;a<stop;a++){
				var inchar=unbase64[str[a]]
				step2.push(inchar&7,(inchar>>3)&7)
			}
			strpos=stop
		}
		function decode15bit(){
			var a
			var stop=Math.min(str.length,strpos+20000)
			for(a=strpos;a<stop;a++){
				var inchar=str.charCodeAt(a)-256
				step2.push(inchar&7,(inchar>>3)&7,(inchar>>6)&7,(inchar>>9)&7,(inchar>>12)&7)
			}
			strpos=stop
		}
		function morenumbers(){
			var a
			var stop
			decode()
			moreinput=str.length!==strpos
			if(!moreinput){
				while(step2[step2.length-1]==7){
					step2.pop()
				}
			}
			stop=step2.length-(moreinput?50:0)
			for(a=0;a<stop;a++){
				var number=0
				var multiplier=1
				while(step2[a]>3){
					number+=step2[a]*multiplier
					multiplier*=4
					a++
				}
				number+=step2[a]*multiplier
				numbers.push(number)
			}
			step2=step2.slice(a)
		}
		var range={}
		var literal={}
		var reset={}
		var commandlist
		var lastcommand
		var nextinsert
		var movernd
		function resetstate(){
			var a
			commandlist=[range]
			commandlist[96]=reset
			commandlist[97]=literal
			lastcommand=97
			for(a=1;a<96;a++){
				commandlist[a]=String.fromCharCode(31+a)
			}
			nextinsert=0
			movernd=0
		}
		resetstate()
		function insertnew(obj){
			lastcommand++
			commandlist[lastcommand]=obj
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
		var result=[]
		var rangelength
		var addstring
		morenumbers()
		for(a=0;a<numbers.length;a++){
			if(moreinput && a+50>numbers.length){
				numbers=numbers.slice(a)
				a=0
				morenumbers()
			}
			var commandno=numbers[a]
			if(commandno>=64){
				commandno=lastcommand-commandno+64
			}
			var command=commandlist[commandno]
			if(command===undefined){
				return false
			}
			promote(commandno)
			if(typeof command==="number"){
				a++
				rangelength=numbers[a]+4
				if(original.length+rangelength>5000010){
					return false
				}
				for(b=0;b<rangelength;b++){
					original.push(original[command+b])
				}
				insertnew([command,rangelength])
			}
			else if(command===literal){
				a++
				var literalchar=String.fromCharCode(numbers[a])
				insertnew(literalchar)
				original.push(literalchar)
			}
			else if(command===range){
				a++
				var beginfrom=numbers[a]
				if(beginfrom>=original.length){
					return false
				}
				insertnew(beginfrom)
				a++
				rangelength=numbers[a]+4
				for(b=0;b<rangelength;b++){
					original.push(original[beginfrom+b])
				}
				insertnew([beginfrom,rangelength])
			}
			else if(command===reset){
				maxlength-=original.length
				if(maxlength<0){
					return false
				}
				resetstate()
				result.push(original.join(""))
				original=[]
			}
			else if(typeof command==="string"){
				original.push(command)
			}
			else{
				if(original.length+command[1]>5000010){
					return false
				}
				for(b=0;b<command[1];b++){
					original.push(original[command[0]+b])
				}
			}
		}
		if(maxlength-original.length<0){
			return false
		}
		result.push(original.join(""))
		return result.join("")
	}
}