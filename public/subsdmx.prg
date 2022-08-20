' Copyright (C) 2022 Louis de Charsonville

' This program is free software: you can redistribute it and/or modify
' it under the terms of the GNU Affero General Public License version 3 as
' published by the Free Software Foundation.

' This program is distributed in the hope that it will be useful,
' but WITHOUT ANY WARRANTY; without even the implied warranty of
' MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
' GNU General Public License for more details.

' You should have received a copy of the GNU General Public License
' along with this program.  If not, see <http://www.gnu.org/licenses/>.

%__providers = "ecb insee eurostat buba norges weurostat"

subroutine sdmx(string %provider, string %series, string %filters, string %rename)

        ' Api Key Quandl & BLS 
        %__quandl = "" ' PUT YOUR API KEY BETWEEN THE QUOTES
        %__bls  = ""   ' PUT YOUR API KEY BETWEEN THE QUOTES
        %__fred  = ""  ' PUT YOUR API KEY BETWEEN THE QUOTES
        
        %__app = "http://sdmx.herokuapp.com/"
        %__url = %__app

	%__renlist = ""
	if @wcount(%rename) > 0 then
		!__wc = @wcount(%rename) - 1
		for !____k = 1 to !__wc
			%__renlist = %__renlist + @word(%rename, !____k) + "," 
		next
		!__wc = !__wc + 1
		%__renlist = %__renlist + @word(%rename, !__wc)
	endif
        
        if %provider = "quandl" or %provider = "bls" or %provider = "fred" then
                %__url = %__url + %provider + "/" + %__{%provider} + "/" + %series + %filters
                if @len(%rename) > 0 then
                        import(t=html) %__url names=("date",%rename)
                else
                        import(t=html) %__url
                endif
        else
                if %provider = "oecd" then
                        %__url = %__url + %provider + "/" + %series + %filters
                        if @len(%rename) > 0 then
                                import(t=html) %__url colhead=2 namepos=none names=("date",{%__renlist})
                        else
                                import(t=html) %__url colhead=2 namepos=first
                        endif
                else
                        if @wintersect(%provider,%__providers) = %provider then
                                %__url = %__url + %provider + "/" + "series/" + %series + %filters
                                if @len(%rename) > 0 then
                                        import(t=html) %__url colhead=2 namepos=none names=("date",{%__renlist})
                                else
                                        import(t=html) %__url colhead=2 namepos=first
                                endif
                        else
                                %__url = %__url + "req?url=" + "'"  + %series + "'"
                                if @len(%rename) > 0 then
                                        import(t=html) %__url colhead=2 namepos=none names=("date",{%__renlist})
                                else
                                        import(t=html) %__url colhead=2 namepos=first
                                endif
                        endif
                endif
        endif       
endsub

subroutine sdmx_v2(string %provider, string %ressource, string %series, string %filters, string %rename)

        ' Api Key Quandl & BLS 
        %__quandl = "" ' PUT YOUR API KEY BETWEEN THE QUOTES
        %__bls  = ""   ' PUT YOUR API KEY BETWEEN THE QUOTES
        %__fred  = ""  ' PUT YOUR API KEY BETWEEN THE QUOTES
        
        %__app = "http://sdmx.herokuapp.com/"
        %__url = %__app

	%__renlist = ""
	if @wcount(%rename) > 0 then
		!__wc = @wcount(%rename) - 1
		for !____k = 1 to !__wc
			%__renlist = %__renlist + @word(%rename, !____k) + "," 
		next
		!__wc = !__wc + 1
		%__renlist = %__renlist + @word(%rename, !__wc)
	endif
        
        if %provider = "quandl" or %provider = "bls" or %provider = "fred" then
                %__url = %__url + %provider + "/" + %__{%provider} + "/" + %series + %filters
                if @len(%rename) > 0 then
                        import(t=html) %__url names=("date",%rename)
                else
                        import(t=html) %__url
                endif
        else
                if %provider = "oecd" then
                        %__url = %__url + %provider + "/" + %series + %filters
                        if @len(%rename) > 0 then
                                import(t=html) %__url colhead=2 namepos=none names=("date",{%__renlist})
                        else
                                import(t=html) %__url colhead=2 namepos=first
                        endif
                else
                        if @wintersect(%provider,%__providers) = %provider then
			        if %ressource = "dataset" then
				        %__url = %__url + %provider + "/" + "dataset/" + %series + %filters
			        else
				        %__url = %__url + %provider + "/" + "series/" + %series + %filters
			        endif
                                if @len(%rename) > 0 then
                                        import(t=html) %__url colhead=2 namepos=none names=("date",{%__renlist})
                                else
                                        import(t=html) %__url colhead=2 namepos=first
                                endif
                        else
                                %__url = %__url + "req?url=" + "'"  + %series + "'"
                                if @len(%rename) > 0 then
                                        import(t=html) %__url colhead=2 namepos=none names=("date",{%__renlist})
                                else
                                        import(t=html) %__url colhead=2 namepos=first
                                endif
                        endif
                endif
        endif       
endsub
