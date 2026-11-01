.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
library(lavaan)
print(grep('syntax|Syntax',ls(asNamespace('lavaan')),value=TRUE))
for(text in c('F =~ 0','F =~ NA*0','x ~~ x','F =~ x1 + start(.5)*lower(0)*a*x2\na > 0')) {
 cat('\nMODEL:',text,'\n')
 try({raw <- lavParseModelString(text,as_data_frame=TRUE);print(raw);str(attributes(raw));pt <- lavaanify(text,auto=TRUE,model_type='sem',fixed_x=FALSE);print(pt);print(lavNames(pt,'lv'));print(lavNames(pt,'ov'))})
}
pt <- lavaanify('F =~ x1 + x2 + x3',auto=TRUE,model_type='sem',fixed_x=FALSE)
cat('\nNORMALISE PARAMETER TABLE\n');try(print(lavaanify(pt,auto=TRUE,model_type='sem',fixed_x=FALSE)))
for(text in c('F =~ c(1,NA)*x1 + c(a,b)*x2 + x3\na == b','F =~ x1 + x2 + x3\na := z*2','F =~ a*1*x1 + NA*start(.5)*x2 + x3')) {
cat('\nRAW:',text,'\n');try({raw<-lavParseModelString(text,as_data_frame=TRUE);print(raw);str(attributes(raw));print(lavaanify(text,auto=TRUE,ngroups=2,model_type='sem',fixed_x=FALSE))})
}
